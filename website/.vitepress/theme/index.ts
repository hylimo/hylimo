import type { Theme as VitepressTheme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import "./style.css";
import "./icons.css";
import EmbeddedHylimoEditor from "../components/EmbeddedHylimoEditor.vue";
import NavTeleportTarget from "../components/NavTeleportTarget.vue";
import Settings from "../components/Settings.vue";
import { h } from "vue";
import RegisterSW from "../components/RegisterSW.vue";

export default {
    extends: DefaultTheme,
    async enhanceApp({ app }) {
        app.component("EmbeddedHylimoEditor", EmbeddedHylimoEditor);
        app.component("NavTeleportTarget", NavTeleportTarget);
        app.component("Settings", Settings);
        if (!import.meta.env.SSR) {
            const { lspPlugin } = await import("./lspPlugin");
            app.use(lspPlugin);
        }
    },
    Layout() {
        return h(DefaultTheme.Layout, null, {
            "layout-bottom": () => h(RegisterSW)
        });
    }
} satisfies VitepressTheme;
