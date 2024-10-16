import { harfbuzzjsSubset } from "@hylimo/wasm-libs";
import { convert } from "fontverter";
import { Buffer } from "buffer";
import pLimit from "p-limit";

export class SubsetManager {
    /**
     * The cached harfbuzzjs instance
     */
    private harfbuzzJs?: {
        harfbuzzJsWasm: any;
        heapu8: Uint8Array;
    };

    /**
     * Used to limit the number of concurrent subsetFontInternal calls to 1
     */
    private readonly limiter = pLimit(1);

    /**
     * Subsets a font
     * Modified version of papandreou/subset-font
     * Always includes the following name table entries: COPYRIGHT, TRADEMARK, LICENSE, LICENSE_URL
     *
     * @param originalFont the original font to subset
     * @param text text including all characters that should be included in the subset
     * @param variationAxes optional object with variation axes to pin to specific values
     * @returns the subset font
     */
    async subsetFont(
        originalFont: Buffer,
        text: string,
        variationAxes: Record<string, number> | undefined
    ): Promise<Buffer> {
        return this.limiter(() => this.subsetFontInternal(originalFont, text, variationAxes));
    }

    /**
     * Gets the harfbuzzjs instance
     * Result is cached
     * Must NOT be called concurrently / interleaved
     *
     * @returns the harfbuzzjs instance
     */
    private async getHarfbuzzJs(): Promise<{
        harfbuzzJsWasm: any;
        heapu8: Uint8Array;
    }> {
        if (this.harfbuzzJs == undefined) {
            const wasm = await harfbuzzjsSubset();
            const instance = (await WebAssembly.instantiate(wasm)).exports as any;
            const heapu8 = new Uint8Array(instance.memory.buffer);
            this.harfbuzzJs = { harfbuzzJsWasm: instance, heapu8 };
        }
        return this.harfbuzzJs;
    }

    /**
     * Creates a 32-bit integer from a string.
     *
     * @param str The string to convert, should be 4 characters long.
     * @returns The 32-bit integer.
     */
    private HB_TAG(str: string): number {
        return str.split("").reduce(function (a, ch) {
            return (a << 8) + ch.charCodeAt(0);
        }, 0);
    }

    /**
     * Subsets a font
     * Modified version of papandreou/subset-font
     * Always includes the following name table entries: COPYRIGHT, TRADEMARK, LICENSE, LICENSE_URL
     * Must NOT be called concurrently / interleaved
     *
     * @param originalFont the original font to subset
     * @param text text including all characters that should be included in the subset
     * @param variationAxes optional object with variation axes to pin to specific values
     * @returns the subset font
     */
    private async subsetFontInternal(
        originalFont: Buffer,
        text: string,
        variationAxes: Record<string, number> | undefined
    ): Promise<Buffer> {
        if (typeof text !== "string") {
            throw new Error("The subset text must be given as a string");
        }
        const { harfbuzzJsWasm, heapu8 } = await this.getHarfbuzzJs();

        originalFont = await convert(originalFont, "truetype");

        const input = harfbuzzJsWasm.hb_subset_input_create_or_fail();
        if (input === 0) {
            throw new Error("hb_subset_input_create_or_fail (harfbuzz) returned zero, indicating failure");
        }

        const fontBuffer = harfbuzzJsWasm.malloc(originalFont.byteLength);
        heapu8.set(new Uint8Array(originalFont), fontBuffer);

        const blob = harfbuzzJsWasm.hb_blob_create(
            fontBuffer,
            originalFont.byteLength,
            2, // HB_MEMORY_MODE_WRITABLE
            0,
            0
        );
        const face = harfbuzzJsWasm.hb_face_create(blob, 0);
        harfbuzzJsWasm.hb_blob_destroy(blob);

        const layoutFeatures = harfbuzzJsWasm.hb_subset_input_set(
            input,
            6 // HB_SUBSET_SETS_LAYOUT_FEATURE_TAG
        );
        harfbuzzJsWasm.hb_set_clear(layoutFeatures);
        harfbuzzJsWasm.hb_set_invert(layoutFeatures);

        const inputNameIds = harfbuzzJsWasm.hb_subset_input_set(
            input,
            4 // HB_SUBSET_SETS_NAME_ID
        );
        const preserveNameIds = [
            0, // COPYRIGHT
            7, // TRADEMARK
            13, // LICENSE
            14 // LICENSE_URL
        ];
        for (const nameId of preserveNameIds) {
            harfbuzzJsWasm.hb_set_add(inputNameIds, nameId);
        }

        // Add unicodes indices
        const inputUnicodes = harfbuzzJsWasm.hb_subset_input_unicode_set(input);
        for (const c of text) {
            harfbuzzJsWasm.hb_set_add(inputUnicodes, c.codePointAt(0));
        }

        harfbuzzJsWasm.hb_subset_input_pin_all_axes_to_default();
        if (variationAxes) {
            for (const [axisName, value] of Object.entries(variationAxes)) {
                if (!harfbuzzJsWasm.hb_subset_input_pin_axis_location(input, face, this.HB_TAG(axisName), value)) {
                    harfbuzzJsWasm.hb_face_destroy(face);
                    harfbuzzJsWasm.free(fontBuffer);
                    throw new Error(
                        `hb_subset_input_pin_axis_location (harfbuzz) returned zero when pinning ${axisName} to ${value}, indicating failure. Maybe the axis does not exist in the font?`
                    );
                }
            }
        }

        let subset;
        try {
            subset = harfbuzzJsWasm.hb_subset_or_fail(face, input);
            if (subset === 0) {
                harfbuzzJsWasm.hb_face_destroy(face);
                harfbuzzJsWasm.free(fontBuffer);
                throw new Error(
                    "hb_subset_or_fail (harfbuzz) returned zero, indicating failure. Maybe the input file is corrupted?"
                );
            }
        } finally {
            harfbuzzJsWasm.hb_subset_input_destroy(input);
        }

        const result = harfbuzzJsWasm.hb_face_reference_blob(subset);

        const offset = harfbuzzJsWasm.hb_blob_get_data(result, 0);
        const subsetByteLength = harfbuzzJsWasm.hb_blob_get_length(result);
        if (subsetByteLength === 0) {
            harfbuzzJsWasm.hb_blob_destroy(result);
            harfbuzzJsWasm.hb_face_destroy(subset);
            harfbuzzJsWasm.hb_face_destroy(face);
            harfbuzzJsWasm.free(fontBuffer);
            throw new Error("Failed to create subset font, maybe the input file is corrupted?");
        }

        const subsetFont = Buffer.from(heapu8.subarray(offset, offset + subsetByteLength));

        harfbuzzJsWasm.hb_blob_destroy(result);
        harfbuzzJsWasm.hb_face_destroy(subset);
        harfbuzzJsWasm.hb_face_destroy(face);
        harfbuzzJsWasm.free(fontBuffer);

        return subsetFont;
    }
}
