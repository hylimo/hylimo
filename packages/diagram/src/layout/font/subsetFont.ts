import { harfbuzzjsSubset } from "@hylimo/wasm-libs";
import { Buffer } from "buffer";
import pLimit from "p-limit";

/**
 * The pointer type
 */
type Pointer = number;

/**
 * Helper to create subsets of fonts
 * Large parts of this are a modified version of papandreou/subset-font
 */
export class SubsetManager {
    /**
     * Harfbuzz subset sets name id
     */
    private static readonly HB_SUBSET_SETS_NAME_ID = 4;

    /**
     * Harfbuzz subset sets layout feature tag
     */
    private static readonly HB_SUBSET_SETS_LAYOUT_FEATURE_TAG = 6;

    /**
     * Harfbuzz writable memory mode
     */
    private static readonly HB_MEMORY_MODE_WRITABLE = 2;

    /**
     * OpenType name table ID for the COPYRIGHT notice.
     */
    private static readonly NAME_ID_COPYRIGHT = 0;

    /**
     * OpenType name table ID for the TRADEMARK notice.
     */
    private static readonly NAME_ID_TRADEMARK = 7;

    /**
     * OpenType name table ID for the LICENSE notice.
     */
    private static readonly NAME_ID_LICENSE = 13;

    /**
     * OpenType name table ID for the LICENSE URL.
     */
    private static readonly NAME_ID_LICENSE_URL = 14;

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
     * @param characters text including all characters that should be included in the subset, all characters are included if undefined
     * @param variationAxes optional object with variation axes to pin to specific values
     * @returns the subset font
     */
    async subsetFont(
        originalFont: Buffer,
        characters: string | undefined,
        variationAxes: Record<string, number> | undefined
    ): Promise<Buffer> {
        return this.limiter(() => this.subsetFontInternal(originalFont, characters, variationAxes));
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
     * Always includes the following name table entries: COPYRIGHT, TRADEMARK, LICENSE, LICENSE_URL
     * Must NOT be called concurrently / interleaved
     *
     * @param font the font to subset
     * @param characters text including all characters that should be included in the subset, all characters are included if undefined
     * @param variationAxes optional object with variation axes to pin to specific values
     * @returns the subset font
     */
    private async subsetFontInternal(
        font: Buffer,
        characters: string | undefined,
        variationAxes: Record<string, number> | undefined
    ): Promise<Buffer> {
        const { harfbuzzJsWasm, heapu8 } = await this.getHarfbuzzJs();
        const { input, face, fontBuffer } = this.importFontIntoHarfbuzz(harfbuzzJsWasm, font, heapu8);

        this.setLayoutFeaturesForSubset(harfbuzzJsWasm, input);
        this.setNameTableForSubset(harfbuzzJsWasm, input);
        this.setInputUnicodesForSubset(harfbuzzJsWasm, input, characters);
        try {
            this.setVariationAxesForSubset(harfbuzzJsWasm, variationAxes, input, face);
        } catch (e) {
            this.cleanupResources(harfbuzzJsWasm, face, fontBuffer);
            throw e;
        }

        return this.computeSubset(harfbuzzJsWasm, heapu8, face, input, fontBuffer);
    }

    /**
     * Computes the subset
     *
     * @param harfbuzzJsWasm the harfbuzzjs instance
     * @param heapu8 the harfbuzz instance heap to use
     * @param face the harfbuzz face pointer
     * @param input the harfbuzz input pointer
     * @param fontBuffer the font buffer
     * @returns the subset font
     */
    private computeSubset(harfbuzzJsWasm: any, heapu8: Uint8Array, face: Pointer, input: Pointer, fontBuffer: Pointer) {
        let subset: Pointer;
        try {
            subset = harfbuzzJsWasm.hb_subset_or_fail(face, input);
            if (subset === 0) {
                this.cleanupResources(harfbuzzJsWasm, face, fontBuffer);
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
            this.cleanupResources(harfbuzzJsWasm, face, fontBuffer, result, subset);
            throw new Error("Failed to create subset font, maybe the input file is corrupted?");
        }

        const subsetFont = Buffer.from(heapu8.subarray(offset, offset + subsetByteLength));
        this.cleanupResources(harfbuzzJsWasm, face, fontBuffer, result, subset);
        return subsetFont;
    }

    /**
     * Imports a font into harfbuzz
     *
     * @param harfbuzzJsWasm the harfbuzzjs instance
     * @param convertedFont the converted font
     * @param heapu8 the harfbuzz instance heap to use
     * @returns the input, face and font buffer
     */
    private importFontIntoHarfbuzz(
        harfbuzzJsWasm: any,
        convertedFont: Buffer,
        heapu8: Uint8Array
    ): { input: Pointer; face: Pointer; fontBuffer: Pointer } {
        const input: Pointer = harfbuzzJsWasm.hb_subset_input_create_or_fail();
        if (input === 0) {
            throw new Error("hb_subset_input_create_or_fail (harfbuzz) returned zero, indicating failure");
        }

        const fontBuffer: Pointer = harfbuzzJsWasm.malloc(convertedFont.byteLength);
        heapu8.set(new Uint8Array(convertedFont), fontBuffer);

        const blob: Pointer = harfbuzzJsWasm.hb_blob_create(
            fontBuffer,
            convertedFont.byteLength,
            SubsetManager.HB_MEMORY_MODE_WRITABLE,
            0,
            0
        );
        const face: Pointer = harfbuzzJsWasm.hb_face_create(blob, 0);
        harfbuzzJsWasm.hb_blob_destroy(blob);
        return { input, face, fontBuffer };
    }

    /**
     * Sets the input unicodes for the subset
     *
     * @param harfbuzzJsWasm the harfbuzzjs instance
     * @param input the harfbuzz input pointer
     * @param characters the characters to include in the subset, all characters are included if undefined
     */
    private setInputUnicodesForSubset(harfbuzzJsWasm: any, input: Pointer, characters: string | undefined) {
        const inputUnicodes = harfbuzzJsWasm.hb_subset_input_unicode_set(input);
        if (characters != undefined) {
            for (const c of characters) {
                harfbuzzJsWasm.hb_set_add(inputUnicodes, c.codePointAt(0));
            }
        } else {
            harfbuzzJsWasm.hb_set_clear(inputUnicodes);
            harfbuzzJsWasm.hb_set_invert(inputUnicodes);
            const inputGlyphs = harfbuzzJsWasm.hb_subset_input_glyph_set(input);
            harfbuzzJsWasm.hb_set_clear(inputGlyphs);
            harfbuzzJsWasm.hb_set_invert(inputGlyphs);
        }
    }

    /**
     * Sets the layout features for the subset
     * Removes all layout features
     *
     * @param harfbuzzJsWasm the harfbuzzjs instance
     * @param input the harfbuzz input pointer
     */
    private setLayoutFeaturesForSubset(harfbuzzJsWasm: any, input: Pointer) {
        const layoutFeatures: Pointer = harfbuzzJsWasm.hb_subset_input_set(
            input,
            SubsetManager.HB_SUBSET_SETS_LAYOUT_FEATURE_TAG
        );
        harfbuzzJsWasm.hb_set_clear(layoutFeatures);
        harfbuzzJsWasm.hb_set_invert(layoutFeatures);
    }

    /**
     * Sets the variation axes for the subset
     * Removes all variation axes, uses the default value for non-provided axes
     *
     * @param harfbuzzJsWasm the harfbuzzjs instance
     * @param variationAxes the variation axes
     * @param input the harfbuzz input pointer
     * @param face the harfbuzz face pointer
     */
    private setVariationAxesForSubset(
        harfbuzzJsWasm: any,
        variationAxes: Record<string, number> | undefined,
        input: Pointer,
        face: Pointer
    ) {
        harfbuzzJsWasm.hb_subset_input_pin_all_axes_to_default();
        if (variationAxes) {
            for (const [axisName, value] of Object.entries(variationAxes)) {
                if (!harfbuzzJsWasm.hb_subset_input_pin_axis_location(input, face, this.HB_TAG(axisName), value)) {
                    throw new Error(
                        `hb_subset_input_pin_axis_location (harfbuzz) returned zero when pinning ${axisName} to ${value}, indicating failure. Maybe the axis does not exist in the font?`
                    );
                }
            }
        }
    }

    /**
     * Sets the name table for the subset
     * Removes all name table entries except COPYRIGHT, TRADEMARK, LICENSE, LICENSE_URL
     *
     * @param harfbuzzJsWasm the harfbuzzjs instance
     * @param input the harfbuzz input pointer
     */
    private setNameTableForSubset(harfbuzzJsWasm: any, input: Pointer) {
        const inputNameIds = harfbuzzJsWasm.hb_subset_input_set(input, SubsetManager.HB_SUBSET_SETS_NAME_ID);
        harfbuzzJsWasm.hb_set_clear(inputNameIds);
        const preserveNameIds = [
            SubsetManager.NAME_ID_COPYRIGHT,
            SubsetManager.NAME_ID_TRADEMARK,
            SubsetManager.NAME_ID_LICENSE,
            SubsetManager.NAME_ID_LICENSE_URL
        ];
        for (const nameId of preserveNameIds) {
            harfbuzzJsWasm.hb_set_add(inputNameIds, nameId);
        }
    }

    /**
     * Cleans up resources
     *
     * @param harfbuzzJsWasm the harfbuzzjs instance
     * @param result the harfbuzz result pointer
     * @param subset the harfbuzz subset pointer
     * @param face the harfbuzz face pointer
     * @param fontBuffer the font buffer
     */
    private cleanupResources(
        harfbuzzJsWasm: any,
        face?: Pointer,
        fontBuffer?: Pointer,
        result?: Pointer,
        subset?: Pointer
    ) {
        if (result != undefined) {
            harfbuzzJsWasm.hb_blob_destroy(result);
        }
        if (subset != undefined) {
            harfbuzzJsWasm.hb_face_destroy(subset);
        }
        if (face != undefined) {
            harfbuzzJsWasm.hb_face_destroy(face);
        }
        if (fontBuffer != undefined) {
            harfbuzzJsWasm.free(fontBuffer);
        }
    }
}
