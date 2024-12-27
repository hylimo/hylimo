import type { Theme as VitepressTheme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import "./style.css";
import "./icons.css";
import "@hylimo/diagram-ui/css/hylimo.css";
import "@hylimo/diagram-ui/css/toolbox.css";
import EmbeddedHylimoEditor from "../components/EmbeddedHylimoEditor.vue";
import NavTeleportTarget from "../components/NavTeleportTarget.vue";
import Settings from "../components/settings/Settings.vue";
import { h } from "vue";
import RegisterSW from "../components/RegisterSW.vue";
import { themeColorPlugin } from "./themeColorPlugin";

export default {
    extends: DefaultTheme,
    async enhanceApp({ app }) {
        app.component("EmbeddedHylimoEditor", EmbeddedHylimoEditor);
        app.component("NavTeleportTarget", NavTeleportTarget);
        app.component("Settings", Settings);
        if (!import.meta.env.SSR) {
            app.use(themeColorPlugin);
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
