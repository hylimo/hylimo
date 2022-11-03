import { createToken, IMultiModeLexerDefinition, Lexer } from "chevrotain";

export enum Modes {
    DEFAULT = "DEFAULT",
    IGNORE_NEW_LINE = "IGNORE_NEW_LINES"
}

const whiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /[^\S\n]+/,
    group: Lexer.SKIPPED
});

const newLine = createToken({
    name: "NewLine",
    pattern: /\n/,
    line_breaks: true
});

const skippedNewLine = createToken({
    name: "SkippedNewLine",
    pattern: /\n/,
    line_breaks: true,
    group: Lexer.SKIPPED
});

const openRoundBracket = createToken({
    name: "OpenRoundBracket",
    pattern: /\(/,
    push_mode: Modes.IGNORE_NEW_LINE
});

const closeRoundBracket = createToken({
    name: "CloseRoundBracket",
    pattern: /)/,
    pop_mode: true
});

const openCurlyBracket = createToken({
    name: "OpenCurlyBracket",
    pattern: /{/,
    push_mode: Modes.DEFAULT
});

const closeCurlyBracket = createToken({
    name: "CloseCurlyBracket",
    pattern: /}/,
    pop_mode: true
});

const openSquareBracket = createToken({
    name: "OpenSquareBracket",
    pattern: /\[/,
    push_mode: Modes.IGNORE_NEW_LINE
});

const closeSquareBracket = createToken({
    name: "CloseSquareBracket",
    pattern: /]/,
    pop_mode: true
});

const dot = createToken({
    name: "CloseSquareBracket",
    pattern: /\./
});

const comma = createToken({
    name: "CloseSquareBracket",
    pattern: /,/
});

const identifier = createToken({
    name: "Identifier",
    pattern:
        /(([!#%&'*+\-\/:;<=>?@\\^`|~]|([_$](?![_$]*[a-z0-9])))+)|([a-z_$][a-z0-9_$]*)/i
});

const string = createToken({
    name: "String",
    pattern: /"((\\[\\"nt])|([a-zA-Z0-9!#$%&'()*+,\-.\/:;<=>?@[\]^_`{|}~]))*"/
});

const number = createToken({
    name: "Number",
    pattern: /[0-9]+(\.[0-9]+)?/
});

const standardTokens = [
    whiteSpace,
    openRoundBracket,
    closeRoundBracket,
    openCurlyBracket,
    closeCurlyBracket,
    openSquareBracket,
    closeSquareBracket,
    dot,
    comma,
    identifier,
    string,
    number
];

/**
 * All supported token types of the base language
 */
export const lexerDefinition: IMultiModeLexerDefinition = {
    defaultMode: "",
    modes: {
        [Modes.DEFAULT]: [...standardTokens, newLine],
        [Modes.IGNORE_NEW_LINE]: [...standardTokens, skippedNewLine]
    }
};
