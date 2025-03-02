import { createToken, type IMultiModeLexerDefinition, Lexer } from "chevrotain";

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
    IGNORE_NEW_LINE = "IGNORE_NEW_LINES",
    /**
     * Mode inside string literals
     * Behaves significantly differently from the other modes,
     * as here, only string content, template expressions, and double quotes are matched.
     */
    STRING_LITERAL = "STRING_LITERAL"
}

/**
 * Supported token types
 */
export enum TokenType {
    WHITE_SPACE = "WhiteSpace",
    NEW_LINE = "NewLine",
    SKIPPED_NEW_LINE = "SkippedNewLine",
    OPEN_ROUND_BRACKET = "OpenRoundBracket",
    CLOSE_ROUND_BRACKET = "CloseRoundBracket",
    OPEN_CURLY_BRACKET = "OpenCurlyBracket",
    CLOSE_CURLY_BRACKET = "CloseCurlyBracket",
    OPEN_SQUARE_BRACKET = "OpenSquareBracket",
    CLOSE_SQUARE_BRACKET = "CloseSquareBracket",
    DOT = "Dot",
    COMMA = "Comma",
    IDENTIFIER = "Identifier",
    SIGN_MINUS = "SignMinus",
    EQUAL = "Equal",
    STRING_CONTENT = "StringContent",
    STRING_TEMPLATE_START = "StringTemplateStart",
    STRING_START = "StringStart",
    STRING_END = "StringEnd",
    NUMBER = "Number",
    SINGLE_LINE_COMMENT = "SingleLineComment",
    MULTI_LINE_COMMENT = "MultiLineComment"
}

/**
 * Skipped whitespace token
 */
export const WhiteSpace = createToken({
    name: TokenType.WHITE_SPACE,
    pattern: /[^\S\n]+/,
    group: Lexer.SKIPPED
});

/**
 * Not-skipped newline token
 */
export const NewLine = createToken({
    name: TokenType.NEW_LINE,
    pattern: /\n/,
    line_breaks: true
});

/**
 * Skipped newline token
 */
export const SkippedNewLine = createToken({
    name: TokenType.SKIPPED_NEW_LINE,
    pattern: /\n/,
    line_breaks: true,
    group: Lexer.SKIPPED
});

/**
 * Left round bracket token
 */
export const OpenRoundBracket = createToken({
    name: TokenType.OPEN_ROUND_BRACKET,
    pattern: /\(/,
    push_mode: Modes.IGNORE_NEW_LINE
});

/**
 * Right round bracket token
 */
export const CloseRoundBracket = createToken({
    name: TokenType.CLOSE_ROUND_BRACKET,
    pattern: /\)/,
    pop_mode: true
});

/**
 * Left curly bracket token
 */
export const OpenCurlyBracket = createToken({
    name: TokenType.OPEN_CURLY_BRACKET,
    pattern: /{/,
    push_mode: Modes.DEFAULT
});

/**
 * Right curly bracket token
 */
export const CloseCurlyBracket = createToken({
    name: TokenType.CLOSE_CURLY_BRACKET,
    pattern: /}/,
    pop_mode: true
});

/**
 * Left square bracket token
 */
export const OpenSquareBracket = createToken({
    name: TokenType.OPEN_SQUARE_BRACKET,
    pattern: /\[/,
    push_mode: Modes.IGNORE_NEW_LINE
});

/**
 * Right square bracket token
 */
export const CloseSquareBracket = createToken({
    name: TokenType.CLOSE_SQUARE_BRACKET,
    pattern: /]/,
    pop_mode: true
});

/**
 * Dot token
 */
export const Dot = createToken({
    name: TokenType.DOT,
    pattern: /\.(?!\.)/
});

/**
 * Comma token
 */
export const Comma = createToken({
    name: TokenType.COMMA,
    pattern: /,/
});

/**
 * Identifier token
 * Two types of identifiers exist:
 * - textual identifiers
 *  - can contain ID_Continue characters, underscore and dollar signs
 *  - must start with an ID_Start character, dollar sign or underscore
 *  - must not start with a number
 * - special characters identifiers
 *  - can contain all special characters EXCEPT
 *    - single dot (two or more dots are allowed)
 *    - comma
 *    - equal sign
 *    - round/curly/square brackets
 *    - double quotes
 *    - /*, *\/, //
 *  - if there are trailing underscores or dollar signs, those are only part if afterwards there is no ID_Continue character (except underscore)
 *    - otherwise these are part of the next textual identifier
 */
export const Identifier = createToken({
    name: TokenType.IDENTIFIER,
    pattern: {
        exec: (text, startOffset) => {
            const pattern =
                /((([!#%&'+\-:;<=>?@\\^|~]|\*(?!\/)|\/(?![/*])|\.{2,}|[$_]+(?![\p{ID_Continue}$]))+)|([\p{ID_Start}_$][\p{ID_Continue}$]*)|`[^\n`]+`)/uy;
            pattern.lastIndex = startOffset;
            return pattern.exec(text);
        }
    },
    line_breaks: false
});

/**
 * Sign minus.
 * This is a sign minus followed by
 * - a digit
 * - a dot followed by a digit
 */
export const SignMinus = createToken({
    name: TokenType.SIGN_MINUS,
    pattern: /-(?=\.?[0-9])/,
    longer_alt: Identifier
});

/**
 * Equal sign token
 */
export const Equal = createToken({
    name: TokenType.EQUAL,
    pattern: /=/,
    longer_alt: Identifier
});

/**
 * Content for a string literal except template expressions
 * The following characters must be escaped with a backslash:
 * - double quotes
 * - backslash
 * - dollar sign if followed by opening curly brackets
 *   - can be escaped even if not followed by opening curly brackets
 * Other supported escapes:
 * - n (newline)
 * - t (tab)
 * - u followed by 4 hexadecimal digits (unicode character)
 */
export const StringContent = createToken({
    name: TokenType.STRING_CONTENT,
    pattern: /([^\\$"\n]|\\([\\$"nt]|u[0-9a-fA-F]{4})|\$(?!\{))+/
});

/**
 * Start of a template expression inside a string literal
 */
export const StringTemplateStart = createToken({
    name: TokenType.STRING_TEMPLATE_START,
    pattern: /\${/,
    push_mode: Modes.IGNORE_NEW_LINE
});

/**
 * String literal start token
 */
export const StringStart = createToken({
    name: TokenType.STRING_START,
    pattern: /"/,
    push_mode: Modes.STRING_LITERAL
});

/**
 * String template end token
 */
export const StringEnd = createToken({
    name: TokenType.STRING_END,
    pattern: /"/,
    pop_mode: true
});

/**
 * Number token
 * Can be both an integer and a floating point number
 * Consists of a sequence of digits, optionally followed by a dot and another sequence of digits.
 */
export const Number = createToken({
    name: TokenType.NUMBER,
    pattern: /[0-9]+(\.[0-9]+)?([eE]-?[0-9]+)?/
});

/**
 * Single line comment token
 */
export const SingleLineComment = createToken({
    name: TokenType.SINGLE_LINE_COMMENT,
    pattern: /\/\/[^\n]*/,
    group: "comment"
});

/**
 * Multi line comment token
 */
export const MultiLineComment = createToken({
    name: TokenType.MULTI_LINE_COMMENT,
    pattern: /\/\*[\s\S]*?\*\//,
    group: "comment"
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
    StringStart,
    Number,
    SingleLineComment,
    MultiLineComment
] as const;

/**
 * All supported token types of the base language
 */
export const lexerDefinition: IMultiModeLexerDefinition = {
    defaultMode: Modes.DEFAULT,
    modes: {
        [Modes.DEFAULT]: [...standardTokens, NewLine],
        [Modes.IGNORE_NEW_LINE]: [...standardTokens, SkippedNewLine],
        [Modes.STRING_LITERAL]: [StringContent, StringTemplateStart, StringEnd]
    }
};
