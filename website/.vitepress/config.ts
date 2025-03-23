import { defineConfig } from "vitepress";
import markdown from "./theme/markdown";
import { withPwa } from "@vite-pwa/vitepress";

export default withPwa(
    defineConfig({
        title: "HyLiMo",
        markdown,
        themeConfig: {
            logo: {
                src: "/icons/hylimo.svg",
                width: 35,
                height: 35
            },
            nav: [
                { component: "NavTeleportTarget", props: { "target-id": "diagram-select" } },
                { text: "Docs", link: "/docs/docs" },
                { component: "NavTeleportTarget", props: { "target-id": "copy-diagram-link" } },
                { component: "NavTeleportTarget", props: { "target-id": "save-diagram" } },
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
                    items: [
                        { text: "UML Class Diagram", link: "/docs/class" },
                        { text: "UML Sequence Diagram", link: "/docs/sequence" }
                    ]
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
            ]
        ],
        vite: {
            resolve: {
                dedupe: ["vscode"]
            }
        },
        vue: {
            template: {
                compilerOptions: {
                    isCustomElement: (tag) => tag == "relative-time"
                }
            }
        },
        pwa: {
            registerType: "autoUpdate",
            injectRegister: false,
            manifest: {
                name: "HyLiMo",
                short_name: "HyLiMo",
                theme_color: "#1B1B1F",
                background_color: "#1B1B1F",
                icons: [
                    {
                        src: "/icons/hylimo-128px.avif",
                        sizes: "128x128",
                        type: "image/avif"
                    },
                    {
                        src: "/icons/hylimo-192px.avif",
                        sizes: "192x192",
                        type: "image/avif"
                    },
                    {
                        src: "/icons/hylimo-256px.avif",
                        sizes: "256x256",
                        type: "image/avif"
                    },
                    {
                        src: "/icons/hylimo-256px.jpg",
                        sizes: "256x256",
                        type: "image/jpeg"
                    },
                    {
                        src: "/icons/hylimo-256px.webp",
                        sizes: "256x256",
                        type: "image/webp"
                    },
                    {
                        src: "/icons/hylimo-512px.avif",
                        sizes: "512x512",
                        type: "image/avif"
                    },
                    {
                        src: "/icons/hylimo.svg",
                        sizes: "128x128",
                        type: "image/svg+xml"
                    }
                ],
                screenshots: [
                    {
                        src: "/screenshots/editor.png",
                        sizes: "2000x1000",
                        type: "image/png",
                        form_factor: "wide",
                        label: "Editing an example diagram"
                    },
                    {
                        src: "/screenshots/docs.png",
                        sizes: "2000x1000",
                        type: "image/png",
                        form_factor: "wide",
                        label: "Viewing the documentation"
                    },
                    {
                        src: "/screenshots/search.png",
                        sizes: "2000x1000",
                        type: "image/png",
                        form_factor: "wide",
                        label: "Searching in the documentation"
                    }
                ],
                file_handlers: [{ action: "./", accept: { "text/*": [".hyl"] } }]
            },
            workbox: {
                maximumFileSizeToCacheInBytes: 10 * 1024 ** 2,
                skipWaiting: true,
                clientsClaim: true
            },
            devOptions: {
                enabled: true,
                suppressWarnings: true,
                navigateFallback: "/"
            }
        }
    })
);
