import { nodeResolve } from "@rollup/plugin-node-resolve";
import { wasm } from "@rollup/plugin-wasm";
import typescript from "@rollup/plugin-typescript";
import { glob } from "glob";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

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
        nodeResolve(),
        wasm({
            maxFileSize: Number.POSITIVE_INFINITY
        }),
        typescript()
    ]
};
