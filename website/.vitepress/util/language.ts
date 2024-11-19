import type { editor, languages } from "monaco-editor";

/**
 * Token provider for correct syntax highlighting
 */
export const monarchTokenProvider: languages.IMonarchLanguage = {
    defaultToken: "default",
    includeLF: true,
    start: "expression",
    unicode: true,

    tokenizer: {
        expression: [
            //function call
            [
                /((([!#%&'+\-:;<=>?@\\^`|~]|\*(?!\/)|\/(?![/*])|\.{2,}|[$_]+(?![\p{ID_Continue}$]))+)|([\p{ID_Start}_$][\p{ID_Continue}$]*)(?=[^\S\n]*[{(]))/u,
                { token: "entity.name.function", switchTo: "@expression.after" }
            ],

            //variable
            [
                /(([!#%&'+\-:;<=>?@\\^`|~]|\*(?!\/)|\/(?![/*])|\.{2,}|[$_]+(?![\p{ID_Continue}$]))+)|([\p{ID_Start}_$][\p{ID_Continue}$]*)/u,
                { token: "variable", switchTo: "@expression.after" }
            ],

            // number
            [/[0-9]+(\.[0-9]+)?([eE]-?[0-9]+)?/u, { token: "constant.numerical", switchTo: "@expression.after" }],

            // strings
            [/"/u, { token: "string.quote", bracket: "@open", switchTo: "@string" }],

            // open brackets
            [
                /\(/u,
                {
                    token: "delimiter.round.open",
                    bracket: "@open",
                    switchTo: "@expression"
                }
            ],
            [
                /\{/u,
                {
                    token: "@rematch",
                    switchTo: "@expression.after"
                }
            ],
            [
                /\[/u,
                {
                    token: "delimiter.square.open",
                    bracket: "@open",
                    switchTo: "@expression"
                }
            ],

            // close brackets
            [
                /\)/u,
                {
                    token: "delimiter.round.close",
                    bracket: "@close",
                    switchTo: "@expression.after"
                }
            ],
            [
                /\}/u,
                {
                    token: "delimiter.curly.close",
                    bracket: "@close",
                    next: "@pop"
                }
            ],
            [
                /\]/u,
                {
                    token: "delimiter.square.close",
                    bracket: "@close",
                    switchTo: "@expression.after"
                }
            ],

            // comma
            [/,/u, { token: "delimiter.comma", switchTo: "@expression" }],

            // whitespace
            { include: "@whitespace" },

            //newline
            [/\n/u, "white"]
        ],

        "expression.after": [
            // dot
            [/\.(?!\.)/u, { token: "delimiter.dot", switchTo: "@expression.after.access" }],

            // newline
            [/\n/, { token: "white", switchTo: "@expression" }],

            // variable
            [
                /((([!#%&'+\-:;<=>?@\\^`|~]|\*(?!\/)|\/(?![/*])|\.{2,}|([_$](?![_$]*[a-zA-Z0-9])))+)|([a-zA-Z_$][a-zA-Z0-9_$]*|\.)+)/u,
                {
                    token: "operator",
                    switchTo: "@expression"
                }
            ],

            // open curly bracket
            [
                /\{/u,
                {
                    token: "delimiter.curly.open",
                    bracket: "@open",
                    next: "@expression"
                }
            ],

            // else
            { include: "@expression" }
        ],

        "expression.after.access": [
            //function call
            [
                /((([!#%&'+\-:;<=>?@\\^`|~]|\*(?!\/)|\/(?![/*])|\.{2,}|[$_]+(?![\p{ID_Continue}$]))+)|([\p{ID_Start}_$][\p{ID_Continue}$]*)(?=[^\S\n]*[{(]))/u,
                {
                    token: "entity.name.function",
                    switchTo: "expression.after"
                }
            ],

            //variable
            [
                /(([!#%&'+\-:;<=>?@\\^`|~]|\*(?!\/)|\/(?![/*])|\.{2,}|[$_]+(?![\p{ID_Continue}$]))+)|([\p{ID_Start}_$][\p{ID_Continue}$]*)/u,
                {
                    token: "variable.property",
                    switchTo: "@expression.after"
                }
            ],

            // open curly bracket
            [
                /\{/u,
                {
                    token: "@rematch",
                    switchTo: "@expression.after"
                }
            ],

            // else
            { include: "@expression.after" }
        ],

        string: [
            [/\$\{/u, { token: "delimiter.curly.open", bracket: "@open", next: "@expression" }],
            [/([^\\$"\n]|\$(?!\{))+/u, "string"],
            [/\\([\\"nt]|u[0-9a-fA-F]{4})/u, "string.escape"],
            [/\\./u, "string.escape.invalid"],
            [/"/u, { token: "string.quote", bracket: "@close", switchTo: "@expression.after" }]
        ],

        whitespace: [
            [/[^\S\n]+/u, "white"],
            [/\/\*/u, "comment", "@comment"],
            [/\/\/.*/u, "comment"]
        ],

        comment: [
            [/[^/*]+/u, "comment"],
            [/\*\//u, "comment", "@pop"],
            [/[/*]/u, "comment"]
        ]
    }
};

/**
 * Language configuration defining brackets
 */
export const languageConfiguration: languages.LanguageConfiguration = {
    surroundingPairs: [
        { open: "{", close: "}" },
        { open: "(", close: ")" },
        { open: "[", close: "]" },
        { open: '"', close: '"' }
    ],
    autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "(", close: ")" },
        { open: "[", close: "]" },
        { open: '"', close: '"' }
    ],
    brackets: [
        ["{", "}"],
        ["(", ")"],
        ["[", "]"],
        ["${", "}"]
    ],
    colorizedBracketPairs: [
        ["{", "}"],
        ["(", ")"],
        ["[", "]"]
    ],
    comments: {
        lineComment: "//",
        blockComment: ["/*", "*/"]
    }
};

/**
 * Dark color theme
 */
export const customDarkTheme: editor.IStandaloneThemeData = {
    base: "vs-dark",
    inherit: true,
    rules: [
        {
            token: "default",
            foreground: "#ff0000"
        },
        {
            token: "entity.name.function",
            foreground: "#dcdcaa"
        },
        {
            token: "variable",
            foreground: "#4fc1ff"
        },
        {
            token: "variable.property",
            foreground: "#9cdcfe"
        },
        {
            token: "string.quoted",
            foreground: "#ce9178"
        },
        {
            token: "string.escape",
            foreground: "#d7ba7d"
        },
        {
            token: "constant.numerical",
            foreground: "#dcdcaa"
        },
        {
            token: "delimiter.curly",
            foreground: "#569cd6"
        }
    ],
    colors: {}
};

/**
 * Light color theme
 */
export const customLightTheme: editor.IStandaloneThemeData = {
    base: "vs",
    inherit: true,
    rules: [
        {
            token: "default",
            foreground: "#ff0000"
        },
        {
            token: "entity.name.function",
            foreground: "#795e26"
        },
        {
            token: "variable",
            foreground: "#0070c1"
        },
        {
            token: "variable.property",
            foreground: "#001080"
        },
        {
            token: "string.quoted",
            foreground: "#a31515"
        },
        {
            token: "string.escape",
            foreground: "#ee0000"
        },
        {
            token: "constant.numerical",
            foreground: "#098658"
        },
        {
            token: "delimiter.curly",
            foreground: "#0000ff"
        }
    ],
    colors: {}
};
