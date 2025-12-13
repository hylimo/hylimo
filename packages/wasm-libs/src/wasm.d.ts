declare module "*.wasm" {
    const wasm: <T extends WebAssembly.Imports | undefined>(
        imports?: T
    ) => Promise<T extends WebAssembly.Imports ? WebAssembly.WebAssemblyInstantiatedSource : WebAssembly.Module>;
    export default wasm;
}
