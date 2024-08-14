import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import "./style.css";
import "./icons.css";
import EmbeddedHylimoEditor from "../components/EmbeddedHylimoEditor.vue";
import NavTeleportTarget from "../components/NavTeleportTarget.vue";
import Settings from "../components/Settings.vue";

export default {
    extends: DefaultTheme,
    async enhanceApp({ app, router, siteData }) {
        app.component("EmbeddedHylimoEditor", EmbeddedHylimoEditor);
        app.component("NavTeleportTarget", NavTeleportTarget);
        app.component("Settings", Settings);
        if (!import.meta.env.SSR) {
            const { lspPlugin } = await import("./lspPlugin");
            app.use(lspPlugin);
        }
    }
} satisfies Theme;
