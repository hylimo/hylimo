declare module "*.wasm" {
    const wasm: (
        imports?: WebAssembly.Imports
    ) => Promise<WebAssembly.WebAssemblyInstantiatedSource | WebAssembly.Module>;
    export default wasm;
}
