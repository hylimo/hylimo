import { nodeResolve } from "@rollup/plugin-node-resolve";
import { wasm } from "@rollup/plugin-wasm";
import typescript from "@rollup/plugin-typescript";
import { glob } from "glob";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

const HARFBUZZ_SUBSET_IMPORT = "harfbuzzjs-subset-wasm";

const harfbuzzSubsetWasmPath = fileURLToPath(
    new URL(
        "../../node_modules/harfbuzzjs/dist/harfbuzz-subset.wasm",
        import.meta.url
    )
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
    plugins: [
        resolveHarfbuzzSubsetPlugin(),
        nodeResolve(),
        wasm({
            maxFileSize: Number.POSITIVE_INFINITY
        }),
        typescript()
    ]
};
