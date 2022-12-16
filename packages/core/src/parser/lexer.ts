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

/**
 * Skipped whitespace token
 */
export const WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /[^\S\n]+/,
    group: Lexer.SKIPPED
});

/**
 * Not-skipped newline token
 */
export const NewLine = createToken({
    name: "NewLine",
    pattern: /\n/,
    line_breaks: true
});

/**
 * Skipped newline token
 */
export const SkippedNewLine = createToken({
    name: "SkippedNewLine",
    pattern: /\n/,
    line_breaks: true,
    group: Lexer.SKIPPED
});

/**
 * Left round bracket token
 */
export const OpenRoundBracket = createToken({
    name: "OpenRoundBracket",
    pattern: /\(/,
    push_mode: Modes.IGNORE_NEW_LINE
});

/**
 * Right round bracket token
 */
export const CloseRoundBracket = createToken({
    name: "CloseRoundBracket",
    pattern: /\)/,
    pop_mode: true
});

/**
 * Left curly bracket token
 */
export const OpenCurlyBracket = createToken({
    name: "OpenCurlyBracket",
    pattern: /{/,
    push_mode: Modes.DEFAULT
});

/**
 * Right curly bracket token
 */
export const CloseCurlyBracket = createToken({
    name: "CloseCurlyBracket",
    pattern: /}/,
    pop_mode: true
});

/**
 * Left square bracket token
 */
export const OpenSquareBracket = createToken({
    name: "OpenSquareBracket",
    pattern: /\[/,
    push_mode: Modes.IGNORE_NEW_LINE
});

/**
 * Right square bracket token
 */
export const CloseSquareBracket = createToken({
    name: "CloseSquareBracket",
    pattern: /]/,
    pop_mode: true
});

/**
 * Dot token
 */
export const Dot = createToken({
    name: "Dot",
    pattern: /\./
});

/**
 * Comma token
 */
export const Comma = createToken({
    name: "Comma",
    pattern: /,/
});

/**
 * Identifier token
 * Two types of identifiers exist:
 * - textual identifiers
 *  - can contain alphanumerical characters, underscore and dollar signs
 *  - must not start with a number
 *  - must contain at least one alphanumerical character
 * - special characters identifiers
 *  - can contain all special characters EXCEPT
 *    - dot
 *    - comma
 *    - equal sign
 *    - round/curly/square brackets
 *    - double quotes
 *  - if there are trailing underscores or dollar signs, those are only part if afterwards there is no alphnumerical character
 *    - otherwise these are part of the next textual identifier
 */
export const Identifier = createToken({
    name: "Identifier",
    pattern: /(([!#%&'*+\-\/:;<=>?@\\^`|~]|([_$](?![_$]*[a-z0-9])))+)|([a-z_$][a-z0-9_$]*)/i
});

/**
 * Sign minus.
 * This is a sign minus followed by
 * - a digit
 * - a dot followed by a digit
 */
export const SignMinus = createToken({
    name: "SignMinus",
    pattern: /-(?=[^\S\n]*\.?[0-9])/,
    longer_alt: Identifier
});

/**
 * Equal sign token
 */
export const Equal = createToken({
    name: "Equal",
    pattern: /=/,
    longer_alt: Identifier
});

/**
 * String literal token
 * Must be enclosed in double quotes
 * The following characters must be escaped with a backslash:
 * - double quotes
 * - backslash
 * Other supported escapes:
 * - n (newline)
 * - t (tab)
 */
export const String = createToken({
    name: "String",
    pattern: /"((\\[\\"nt])|([a-zA-Z0-9!#$%&'()*+,\-.\/:;<=>?@[\]^_`{|}~ ]))*"/
});

/**
 * Number token
 * Can be both an integer and a floating point number
 * Consists of a sequence of digits, optionally followed by a dot and another sequence of digits.
 */
export const Number = createToken({
    name: "Number",
    pattern: /[0-9]+(\.[0-9]+)?/
});

/**
 * All tokens except newline tokens
 */
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
    Equal,
    SignMinus,
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
