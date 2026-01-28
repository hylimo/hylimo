import type { ILexerErrorMessageProvider, IToken } from "chevrotain";
import { Modes } from "./lexer.js";

/**
 * Gets a readable name for a lexer mode
 *
 * @param mode The mode name
 * @returns A human-readable description of the mode
 */
function getModeDescription(mode: string | undefined): string {
    switch (mode) {
        case Modes.STRING_LITERAL:
            return "inside a string literal";
        case Modes.IGNORE_NEW_LINE:
            return "inside parentheses, brackets, or template expression";
        case Modes.DEFAULT:
            return "in default context";
        default:
            return mode ? `in ${mode} mode` : "in unknown context";
    }
}

/**
 * Gets the token that opens a given mode based on the closing token
 *
 * @param tokenImage The image of the closing token
 * @returns The corresponding opening token, or undefined
 */
function getMatchingOpenToken(tokenImage: string): string | undefined {
    switch (tokenImage) {
        case ")":
            return "(";
        case "}":
            return "{";
        case "]":
            return "[";
        case '"':
            return '"';
        default:
            return undefined;
    }
}

/**
 * Checks if a character should be displayed with its code point
 *
 * @param charCode The character code
 * @returns true if the character is a control character (should display code instead)
 */
function isControlCharacter(charCode: number): boolean {
    return charCode < 32 && charCode !== 10;
}

/**
 * Gets a human-readable name for a control character
 * @param charCode The character code
 * @returns A descriptive name for the control character
 */
function getControlCharacterName(charCode: number): string {
    const controlCharNames: Record<number, string> = {
        0: "NUL",
        9: "TAB",
        12: "FF (form feed)",
        13: "CR (carriage return)",
        27: "ESC"
    };
    return controlCharNames[charCode] || `control character (code ${charCode})`;
}

/**
 * Checks if a Unicode character has a common ASCII lookalike
 *
 * @param char The character to check
 * @param charCode The character code
 * @returns A suggestion string if it's a lookalike, undefined otherwise
 */
function getUnicodeLookalikeSuggestion(char: string, charCode: number): string | undefined {
    const lookAlikes: Record<string, string> = {
        "\u2018": "' (use regular single quote, or \" for strings)",
        "\u2019": "' (use regular single quote, or \" for strings)",
        "\u201C": '" (use regular double quote)',
        "\u201D": '" (use regular double quote)',
        "\u2013": "- (use regular hyphen-minus)",
        "\u2014": "- (use regular hyphen-minus)",
        "\u00A0": "  (use regular space)",
        "\u2026": "... (use three periods)",
        "\uFEFF": "(BOM - byte order mark) - remove this invisible character from the file",
        "\u200B": "(zero-width space) - remove this invisible character",
        "\u200C": "(zero-width non-joiner) - remove this invisible character",
        "\u200D": "(zero-width joiner) - remove this invisible character",
        "\u2060": "(word joiner) - remove this invisible character",
        "\u202F": "(narrow no-break space) - use a regular space"
    };

    if (lookAlikes[char]) {
        return `Unicode character "${char}" (U+${charCode.toString(16).toUpperCase().padStart(4, "0")}) looks like ${lookAlikes[char]} but is not recognized.`;
    }

    return undefined;
}

/**
 * Analyzes and returns an error message for an invalid escape sequence
 *
 * @param errorChar The character after the backslash
 * @param fullText The full text being lexed
 * @param startOffset The offset where the backslash starts
 * @returns A detailed error message for the escape sequence error
 */
function getEscapeSequenceError(errorChar: string, fullText: string, startOffset: number): string {
    if (errorChar === "u") {
        const remaining = fullText.substring(startOffset + 2, startOffset + 6);
        const validHexCount = remaining.match(/^[0-9a-fA-F]*/)?.[0].length ?? 0;
        if (validHexCount < 4) {
            const shown = fullText.substring(startOffset + 2, startOffset + 2 + Math.max(validHexCount + 1, 1));
            return (
                `Invalid Unicode escape sequence "\\u${shown}". ` +
                `Unicode escapes must be in the format "\\uXXXX" where X is a hexadecimal digit (0-9, a-f, A-F).`
            );
        }
    }

    return (
        `Invalid escape sequence "\\${errorChar}". ` +
        `Valid escape sequences are: \\\\ (backslash), \\$ (dollar sign), \\" (double quote), ` +
        `\\n (newline), \\t (tab), and \\uXXXX (unicode character).`
    );
}

/**
 * Analyzes the context around an unexpected character in a string literal
 *
 * @param fullText The full text being lexed
 * @param startOffset The offset where the error starts
 * @returns A detailed error message for string literal context
 */
function analyzeStringLiteralError(fullText: string, startOffset: number): string {
    const errorChar = fullText.charAt(startOffset);
    const prevChar = startOffset > 0 ? fullText.charAt(startOffset - 1) : "";
    const nextChar = startOffset + 1 < fullText.length ? fullText.charAt(startOffset + 1) : "";

    if (errorChar === "\n") {
        return (
            `Unexpected newline inside string literal. ` +
            `String literals cannot span multiple lines. Use "\\n" for newlines or close the string before the line break.`
        );
    }

    if (prevChar === "\\") {
        if (errorChar === "u") {
            const remaining = fullText.substring(startOffset + 1, startOffset + 5);
            if (!/^[0-9a-fA-F]{4}/.test(remaining)) {
                return (
                    `Invalid Unicode escape sequence "\\u${remaining.substring(0, Math.min(remaining.length, 4))}". ` +
                    `Unicode escapes must be in the format "\\uXXXX" where X is a hexadecimal digit (0-9, a-f, A-F).`
                );
            }
        }
        return (
            `Invalid escape sequence "\\${errorChar}". ` +
            `Valid escape sequences are: \\\\ (backslash), \\$ (dollar sign), \\" (double quote), ` +
            `\\n (newline), \\t (tab), and \\uXXXX (unicode character).`
        );
    }

    if (errorChar === "$" && nextChar === "{") {
        return `Template expression "\${" found but could not be parsed. Check the expression inside the template.`;
    }

    if (errorChar === "\\") {
        if (startOffset + 1 >= fullText.length) {
            return `Backslash at end of input. Escape sequences require a character after the backslash.`;
        }
        const nextC = fullText.charAt(startOffset + 1);
        return getEscapeSequenceError(nextC, fullText, startOffset);
    }

    const charDisplay = isControlCharacter(errorChar.charCodeAt(0))
        ? `(character code ${errorChar.charCodeAt(0)})`
        : `"${errorChar}"`;
    return (
        `Unexpected character ${charDisplay} inside string literal. ` +
        `If you intended to include this character literally, you may need to escape it.`
    );
}

/**
 * Analyzes unexpected characters in default or ignore-newline modes
 *
 * @param fullText The full text being lexed
 * @param startOffset The offset where the error starts
 * @param length The length of the error
 * @param mode The current lexer mode
 * @returns A detailed error message
 */
function analyzeDefaultModeError(
    fullText: string,
    startOffset: number,
    length: number,
    mode: string | undefined
): string {
    const errorChars = fullText.substring(startOffset, startOffset + length);
    const firstChar = errorChars.charAt(0);
    const charCode = firstChar.charCodeAt(0);

    if (firstChar === "/" && startOffset + 1 < fullText.length && fullText.charAt(startOffset + 1) === "*") {
        return `Unterminated multi-line comment. Comments starting with "/*" must be closed with "*/".`;
    }

    if (isControlCharacter(charCode)) {
        const charName = getControlCharacterName(charCode);
        return `Unexpected ${charName} character. Control characters are not allowed outside of string literals.`;
    }

    if (charCode > 127) {
        const lookalikeSuggestion = getUnicodeLookalikeSuggestion(firstChar, charCode);
        if (lookalikeSuggestion) {
            return lookalikeSuggestion;
        }

        return `Unrecognized Unicode character "${firstChar}" (U+${charCode.toString(16).toUpperCase().padStart(4, "0")}). Check if you meant to use an ASCII equivalent.`;
    }

    if (firstChar === "`") {
        return `Backtick identifiers must not be empty and cannot contain newlines. Use the format \`identifier name\`.`;
    }

    const modeDesc = getModeDescription(mode);
    const charDisplay = length > 1 ? `characters "${errorChars}"` : `character "${firstChar}"`;

    return `Unexpected ${charDisplay} ${modeDesc}. This character sequence does not form a valid token.`;
}

/**
 * Custom error message provider for the lexer
 * Provides detailed, context-aware error messages for lexer errors
 */
export const lexerErrorMessageProvider: ILexerErrorMessageProvider = {
    buildUnexpectedCharactersMessage(
        fullText: string,
        startOffset: number,
        length: number,
        line?: number,
        column?: number,
        mode?: string
    ): string {
        const positionInfo = line !== undefined && column !== undefined ? ` at line ${line}, column ${column}` : "";

        if (mode === Modes.STRING_LITERAL) {
            return analyzeStringLiteralError(fullText, startOffset) + positionInfo;
        }

        return analyzeDefaultModeError(fullText, startOffset, length, mode) + positionInfo;
    },
    buildUnableToPopLexerModeMessage(token: IToken): string {
        const openToken = getMatchingOpenToken(token.image);

        if (openToken) {
            if (token.image === '"') {
                return (
                    `Unexpected closing quote '"' without a matching opening quote. ` +
                    `Check if you have an extra quote or if a string was not properly opened.`
                );
            }
            return (
                `Unbalanced '${token.image}' - no matching '${openToken}' found. ` +
                `Check if you have an extra closing bracket or if an opening bracket is missing.`
            );
        }

        return (
            `Unable to process token "${token.image}" - the bracket/parenthesis stack is empty. ` +
            `This usually indicates unbalanced brackets or parentheses in your code.`
        );
    }
};
