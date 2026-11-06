/// <reference types="vite/client" />
/// <reference types="@unplugin-pwa/core/vanillajs" />

declare module "*.vue" {
    import type { DefineComponent } from "vue";
    const component: DefineComponent;
    export default component;
}
