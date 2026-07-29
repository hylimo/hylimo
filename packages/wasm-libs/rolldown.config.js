import { glob } from "glob";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

const HARFBUZZ_SUBSET_IMPORT = "harfbuzzjs-subset-wasm";

const harfbuzzSubsetWasmPath = fileURLToPath(
    new URL("../../node_modules/harfbuzzjs/dist/harfbuzz-subset.wasm", import.meta.url)
);

function resolveHarfbuzzSubsetPlugin() {
    return {
        name: "resolve-harfbuzz-subset-wasm",
        resolveId(source) {
            if (source === HARFBUZZ_SUBSET_IMPORT) {
                return harfbuzzSubsetWasmPath;
            }
            return null;
        }
    };
}

/**
 * Inlines every imported `.wasm` file as base64 and exposes it as a function which either
 * instantiates the module (if imports are provided) or only compiles it.
 * The generated module deliberately contains no Node-specific file loading path so that the
 * bundle stays usable in the browser, see wasm.d.ts for the resulting type.
 */
function inlineWasmPlugin() {
    return {
        name: "inline-wasm",
        load: {
            filter: { id: /\.wasm$/ },
            async handler(id) {
                const base64 = JSON.stringify((await fs.readFile(id)).toString("base64"));
                return `let bytes;
function decode() {
    const source = ${base64};
    return typeof Buffer !== "undefined"
        ? Buffer.from(source, "base64")
        : Uint8Array.from(globalThis.atob(source), (character) => character.charCodeAt(0));
}
export default function (imports) {
    bytes ??= decode();
    return imports ? WebAssembly.instantiate(bytes, imports) : WebAssembly.compile(bytes);
}`;
            }
        }
    };
}

export default {
    input: Object.fromEntries(
        glob
            .sync("src/**/*.ts")
            .filter((file) => !file.endsWith(".d.ts"))
            .map((file) => [
                path.relative("src", file.slice(0, file.length - path.extname(file).length)),
                fileURLToPath(new URL(file, import.meta.url))
            ])
    ),
    output: {
        format: "esm",
        dir: "lib",
        sourcemap: true
    },
    plugins: [resolveHarfbuzzSubsetPlugin(), inlineWasmPlugin()]
};
