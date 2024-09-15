import { defineConfig } from "vitepress";
import markdown from "./theme/markdown";

export default defineConfig({
    title: "HyLiMo",
    markdown,
    themeConfig: {
        logo: {
            src: "/icons/hylimo.svg",
            width: 35,
            height: 35
        },
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
    },
    head: [
        [
            "meta",
            {
                name: "description",
                content: "Graphical and text editor for diagrams, especially UML diagrams"
            }
        ],
        [
            "meta",
            {
                name: "author",
                content: "Niklas Krieger and Leon Hofmeister"
            }
        ],
        ["link", { rel: "icon", href: "/favicon.ico" }],
        [
            "meta",
            {
                name: "keywords",
                content: "UML diagram editor, graphical editor, text editor, diagram editor"
            }
        ],
        [
            "meta",
            {
                name: "charset",
                content: "UTF-8"
            }
        ],

        // Config for the PWA:
        ["link", { rel: "canonical", href: "https://hylimo.github.io" }],
        ["link", { rel: "manifest", href: "/manifest.webmanifest" }],
        [
            "script",
            { id: "register-service-worker" },
            `;(() => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/serviceworker.js')
        }
      })()`
        ]
    ],
    vite: {
        resolve: {
            dedupe: ["vscode"]
        }
    }
});
