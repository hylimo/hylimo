import { createToken, IMultiModeLexerDefinition, Lexer } from "chevrotain";

/**
 * Supported lexer modes
 */
export enum Modes {
    /**
     * Default mode, keep newlines in cst
     */
    DEFAULT = "DEFAULT",
    /**
     * Skip newlines in cst
     */
    IGNORE_NEW_LINE = "IGNORE_NEW_LINES"
}

export const WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /[^\S\n]+/,
    group: Lexer.SKIPPED
});

export const NewLine = createToken({
    name: "NewLine",
    pattern: /\n/,
    line_breaks: true
});

export const SkippedNewLine = createToken({
    name: "SkippedNewLine",
    pattern: /\n/,
    line_breaks: true,
    group: Lexer.SKIPPED
});

export const OpenRoundBracket = createToken({
    name: "OpenRoundBracket",
    pattern: /\(/,
    push_mode: Modes.IGNORE_NEW_LINE
});

export const CloseRoundBracket = createToken({
    name: "CloseRoundBracket",
    pattern: /\)/,
    pop_mode: true
});

export const OpenCurlyBracket = createToken({
    name: "OpenCurlyBracket",
    pattern: /{/,
    push_mode: Modes.DEFAULT
});

export const CloseCurlyBracket = createToken({
    name: "CloseCurlyBracket",
    pattern: /}/,
    pop_mode: true
});

export const OpenSquareBracket = createToken({
    name: "OpenSquareBracket",
    pattern: /\[/,
    push_mode: Modes.IGNORE_NEW_LINE
});

export const CloseSquareBracket = createToken({
    name: "CloseSquareBracket",
    pattern: /]/,
    pop_mode: true
});

export const Dot = createToken({
    name: "CloseSquareBracket",
    pattern: /\./
});

export const Comma = createToken({
    name: "CloseSquareBracket",
    pattern: /,/
});

export const Equal = createToken({
    name: "Equal",
    pattern: /=/
});

export const Identifier = createToken({
    name: "Identifier",
    pattern: /(([!#%&'*+\-\/:;<=>?@\\^`|~]|([_$](?![_$]*[a-z0-9])))+)|([a-z_$][a-z0-9_$]*)/i
});

export const String = createToken({
    name: "String",
    pattern: /"((\\[\\"nt])|([a-zA-Z0-9!#$%&'()*+,\-.\/:;<=>?@[\]^_`{|}~]))*"/
});

export const Number = createToken({
    name: "Number",
    pattern: /[0-9]+(\.[0-9]+)?/
});

const standardTokens = [
    WhiteSpace,
    OpenRoundBracket,
    CloseRoundBracket,
    OpenCurlyBracket,
    CloseCurlyBracket,
    OpenSquareBracket,
    CloseSquareBracket,
    Dot,
    Comma,
    Identifier,
    String,
    Number
];

/**
 * All supported token types of the base language
 */
export const lexerDefinition: IMultiModeLexerDefinition = {
    defaultMode: Modes.DEFAULT,
    modes: {
        [Modes.DEFAULT]: [...standardTokens, NewLine],
        [Modes.IGNORE_NEW_LINE]: [...standardTokens, SkippedNewLine]
    }
};
