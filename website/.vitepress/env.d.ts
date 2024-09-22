/// <reference types="vite/client" />

declare module "*.vue" {
    import type { DefineComponent } from "vue";
    const component: DefineComponent;
    export default component;
}

declare module "virtual:pwa-register" {
    import type { RegisterSWOptions } from "vite-plugin-pwa/types";

    export type { RegisterSWOptions };

    export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
