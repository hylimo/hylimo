/**
 * Token provider for correct syntax highlighting
 */
export const monarchTokenProvider = {
    defaultToken: "default",
    includeLF: true,
    start: "expression",

    tokenizer: {
        expression: [
            //function call
            [
                /((([!#%&'*+\-\/:;<=>?@\\^`|~]|([_$](?![_$]*[a-zA-Z0-9])))+)|([a-zA-Z_$][a-zA-Z0-9_$]*)(?=[^\S\n]*[{(]))/,
                { token: "entity.name.function", switchTo: "@expression.after" }
            ],

            //variable
            [
                /(([!#%&'*+\-\/:;<=>?@\\^`|~]|([_$](?![_$]*[a-zA-Z0-9])))+)|([a-zA-Z_$][a-zA-Z0-9_$]*)/,
                { token: "variable", switchTo: "@expression.after" }
            ],

            // number
            [/[0-9]+(\.[0-9]+)?/, { token: "constant.numerical", switchTo: "@expression.after" }],

            // strings
            [/"([^"\\]|\\.)*$/, "string.invalid"], // non-teminated string
            [/"/, { token: "string.quote", bracket: "@open", switchTo: "@string" }],

            // open brackets
            [
                /\(/,
                {
                    token: "delimiter.round.open",
                    bracket: "@open",
                    switchTo: "@expression"
                }
            ],
            [
                /{/,
                {
                    token: "delimiter.curly.open",
                    bracket: "@open",
                    switchTo: "@expression"
                }
            ],
            [
                /\[/,
                {
                    token: "delimiter.square.open",
                    bracket: "@open",
                    switchTo: "@expression"
                }
            ],

            // close brackets
            [
                /\)/,
                {
                    token: "delimiter.round.close",
                    bracket: "@close",
                    switchTo: "@expression.after"
                }
            ],
            [
                /}/,
                {
                    token: "delimiter.curly.close",
                    bracket: "@close",
                    switchTo: "@expression.after"
                }
            ],
            [
                /]/,
                {
                    token: "delimiter.square.close",
                    bracket: "@close",
                    switchTo: "@expression.after"
                }
            ],

            // comma
            [/,/, { token: "delimiter.comma", switchTo: "@expression" }],

            // whitespace
            { include: "@whitespace" },

            //newline
            [/\n/, "white"]
        ],

        "expression.after": [
            // dot
            [/\./, { token: "delimiter.dot", switchTo: "@expression.after.access" }],

            // newline
            [/\n/, { token: "white", switchTo: "@expression" }],

            // variable
            [
                /((([!#%&'*+\-\/:;<=>?@\\^`|~]|([_$](?![_$]*[a-zA-Z0-9])))+)|([a-zA-Z_$][a-zA-Z0-9_$]*|\.)+)/,
                {
                    token: "operator",
                    switchTo: "@expression"
                }
            ],

            // else
            { include: "@expression" }
        ],

        "expression.after.access": [
            //function call
            [
                /((([!#%&'*+\-\/:;<=>?@\\^`|~]|([_$](?![_$]*[a-zA-Z0-9])))+)|([a-zA-Z_$][a-zA-Z0-9_$]*)(?=[^\S\n]*[{(]))/,
                {
                    token: "entity.name.function",
                    switchTo: "expression.after"
                }
            ],

            //variable
            [
                /(([!#%&'*+\-\/:;<=>?@\\^`|~]|([_$](?![_$]*[a-zA-Z0-9])))+)|([a-zA-Z_$][a-zA-Z0-9_$]*)/,
                {
                    token: "variable.property",
                    switchTo: "@expression.after"
                }
            ],

            // else
            { include: "@expression.after" }
        ],

        string: [
            [/[a-zA-Z0-9!#$%&'()*+,\-.\/:;<=>?@[\]^_`{|}~ ]+/, "string"],
            [/\\[\\"nt]/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, { token: "string.quote", bracket: "@close", switchTo: "@expression.after" }]
        ],

        whitespace: [[/[^\S\n]+/, "white"]]
    }
};

/**
 * Language configuration defining brackets
 */
export const languageConfiguration = {
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
        ["[", "]"]
    ]
};

/**
 * Dark color theme
 */
export const customDarkTheme = {
    base: "vs-dark",
    inherit: true,
    rules: [
        {
            token: "default",
            foreground: "#ff0000"
        },
        {
            token: "entity.name.function",
            foreground: "#DCDCAA"
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
            foreground: "#DCDCAA"
        }
    ],
    colors: {}
};

/**
 * Light color theme
 */
export const customLightTheme = {
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
        }
    ],
    colors: {}
};
