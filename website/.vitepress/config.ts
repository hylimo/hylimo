import { defineConfig } from "vitepress";
import markdown from "./theme/markdown";

export default defineConfig({
    title: "HyLiMo",
    markdown,
    themeConfig: {
        nav: [
            { text: "Docs", link: "/docs/docs" },
            { component: "NavTeleportTarget", props: { "target-id": "copy-diagram-link" } },
            { component: "NavTeleportTarget", props: { "target-id": "export-diagram" } },
            { component: "Settings" }
        ],

        sidebar: [
            {
                text: "Getting Started",
                collapsed: false,
                items: [
                    { text: "HyLiMo", link: "/docs/docs" },
                    { text: "Hybrid Editor", link: "/docs/editor" },
                    { text: "SyncScript", link: "/docs/syncscript" },
                    { text: "Diagram DSL", link: "/docs/diagram" }
                ]
            },
            {
                text: "Diagram Types",
                collapsed: false,
                items: [{ text: "UML Class Diagram", link: "/docs/class" }]
            }
        ],

        search: {
            provider: "local"
        },

        socialLinks: [{ icon: "github", link: "https://github.com/hylimo/hylimo" }]
    }
});
