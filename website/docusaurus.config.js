// @ts-check

const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: "HyLiMo",
    tagline: "Dinosaurs are cool",
    url: "https://hylimo.github.io",
    baseUrl: "/",
    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "throw",
    onDuplicateRoutes: "throw",
    organizationName: "hylimo",
    projectName: "hylimo.github.io",
    trailingSlash: false,

    presets: [
        [
            "classic",
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: {
                    sidebarPath: require.resolve("./sidebars.js")
                },
                theme: {
                    customCss: require.resolve("./src/css/custom.css")
                }
            })
        ]
    ],

    themeConfig:
        /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
        ({
            colorMode: {
                defaultMode: "dark"
            },
            navbar: {
                title: "HyLiMo",
                items: [
                    {
                        type: "doc",
                        docId: "docs/docs",
                        position: "left",
                        label: "Docs"
                    },
                    {
                        type: "dropdown",
                        position: "right",
                        label: "Export",
                        items: [
                            {
                                type: "custom-export"
                            }
                        ],
                        ifdiagramexists: true
                    },
                    {
                        type: "custom-save",
                        ifdiagramcodeexists: true,
                        position: "right"
                    },
                    {
                        type: "custom-settings",
                        ifeditor: true,
                        position: "right"
                    },
                    {
                        href: "https://github.com/hylimo/hylimo",
                        className: "header-github-link header-link-icon",
                        "aria-label": "GitHub repository",
                        position: "right"
                    }
                ]
            },
            prism: {
                theme: lightCodeTheme,
                darkTheme: darkCodeTheme
            }
        }),
    plugins: [
        () => ({
            name: "custom-webpack-loaders",
            configureWebpack: () => ({
                plugins: [
                    new MonacoWebpackPlugin({
                        languages: []
                    })
                ],
                resolve: {
                    fallback: {
                        path: false
                    }
                }
            })
        })
    ]
};

module.exports = config;
