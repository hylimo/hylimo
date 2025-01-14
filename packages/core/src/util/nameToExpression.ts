/**
 * Pattern for identifiers which can be used directly without indexing or quotes
 */
const identifierPattern =
    /^((([!#%&'+\-:;<=>?@\\^`|~]|\*(?!\/)|\/(?![/*])|\.{2,}|[$_]+(?![\p{ID_Continue}$]))+)|([\p{ID_Start}_$][\p{ID_Continue}$]*))$/u;

/**
 * Patter for identifiers which can be used in quotes
 */
// eslint-disable-next-line no-control-regex
const quotedIdentifierPattern = /^[^\u0000-\u001f\u2028\u2029\u0085\u007f\n`]+$/;

/**
 * Renders a name (string or number) as an expression.
 * If possible, the name is rendered as a simple identifier.
 * If necessary, it is put in ``.
 * If this is not possible or if a number is passed, an access expression is used
 *
 * @param name the name to render
 * @returns the name as an expression
 */
export function nameToExpression(name: string | number): string {
    if (typeof name === "number") {
        return `this[${name}]`;
    } else if (identifierPattern.test(name)) {
        return name;
    } else if (quotedIdentifierPattern.test(name)) {
        return `\`${name}\``;
    } else {
        return `this[${keyToString(name)}]`;
    }
}

/**
 * Similar to nameToExpression, but assumes that instead of accessing a field on this,
 * the name is accessed on another expression.
 *
 * @param name the name to render
 * @returns the name as an access expression
 */
export function nameToAccessExpression(name: string | number): string {
    if (typeof name === "number") {
        return `[${name}]`;
    } else if (identifierPattern.test(name)) {
        return `.${name}`;
    } else if (quotedIdentifierPattern.test(name)) {
        return `.\`${name}\``;
    } else {
        return `[${keyToString(name)}]`;
    }
}

/**
 * Tests if an identifier needs to be put in quotes
 *
 * @param name the identifier to test (without quotes)
 * @returns true if the identifier needs to be put in quotes
 */
export function identifierNeedsQuotes(name: string): boolean {
    return !identifierPattern.test(name);
}

/**
 * Converts a key to a string
 * Puts the string in quotes and escapes some characters.
 *
 * @param key the key to convert
 * @returns the key as a string
 */
function keyToString(key: string): string {
    // eslint-disable-next-line no-control-regex
    const disallowedPattern = /[\\"\u0000-\u001f\u2028\u2029\u0085\u007f\n]|(\$\{)/g;
    const escapedKey = key.replaceAll(disallowedPattern, (match) => {
        if (match === "\n") {
            return "\\n";
        } else if (match === "\t") {
            return "\\t";
        } else if (match === '"') {
            return '\\"';
        } else if (match === "\\") {
            return "\\\\";
        } else if (match === "${") {
            return "\\${";
        } else {
            const code = match.charCodeAt(0);
            return "\\u" + code.toString(16).padStart(4, "0");
        }
    });

    return `"${escapedKey}"`;
}
