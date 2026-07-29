import type { LanguageRegistration } from "shiki";

/**
 * Alphanumeric identifier, may contain letters, digits, the underscore and the dollar sign
 */
const alphanumericIdentifier = "[\\p{L}_$][\\p{L}\\p{N}_$]*";

/**
 * Symbolic identifier, a sequence of symbols.
 * Note that a single dot is not a symbolic identifier (it is the access operator),
 * and that underscores and dollar signs must not be followed by an alphanumeric character.
 */
const symbolicIdentifier = "(?:[!#%&'+\\-:;<=>?@\\\\^|~]|\\*(?!/)|/(?![/*])|\\.{2,}|[$_]+(?![\\p{L}\\p{N}_$]))+";

/**
 * Identifier escaped with backticks, may contain any character except newlines and backticks
 */
const escapedIdentifier = "`[^\\n`]+`";

/**
 * All three identifier types, each in its own capture group.
 * The order matches the one used by the lexer: symbolic identifiers win over alphanumeric ones.
 */
const identifier = `(${symbolicIdentifier})|(${alphanumericIdentifier})|(${escapedIdentifier})`;

/**
 * Identifier types which are highlighted as a function if called.
 * Symbolic identifiers are excluded on purpose: they are operators, and highlighting e.g. the
 * assignment operator in `myFunction = { }` as a function would be more confusing than helpful.
 */
const callableIdentifier = `(${alphanumericIdentifier})|(${escapedIdentifier})`;

/**
 * Lookahead which matches if the identifier is directly followed by an argument list or a trailing lambda,
 * meaning that it is used as a function
 */
const callLookahead = "(?=[ \\t]*[({])";

/**
 * TextMate grammar for HyLiMo diagrams, meaning SyncScript including the diagram DSL.
 * Used by Shiki to highlight non-interactive code blocks, interactive code blocks are highlighted
 * by Monaco using the Monarch grammar provided by `@hylimo/monaco-editor-support`.
 *
 * As SyncScript has no keywords, highlighting is purely structural: identifiers which are called are
 * functions, identifiers after a dot are properties, and everything else is a variable or an operator.
 */
export const hylLanguage: LanguageRegistration = {
    name: "hyl",
    displayName: "HyLiMo",
    scopeName: "source.hyl",
    aliases: ["syncscript"],
    patterns: [
        { include: "#comment" },
        { include: "#string" },
        { include: "#number" },
        { include: "#access" },
        { include: "#call" },
        { include: "#identifier" },
        { include: "#punctuation" }
    ],
    repository: {
        comment: {
            patterns: [
                {
                    name: "comment.line.double-slash.hyl",
                    match: "//.*$"
                },
                {
                    name: "comment.block.hyl",
                    begin: "/\\*",
                    end: "\\*/"
                }
            ]
        },
        string: {
            name: "string.quoted.double.hyl",
            begin: '"',
            beginCaptures: { 0: { name: "punctuation.definition.string.begin.hyl" } },
            end: '"',
            endCaptures: { 0: { name: "punctuation.definition.string.end.hyl" } },
            patterns: [
                {
                    name: "constant.character.escape.hyl",
                    match: '\\\\(?:[\\\\"nt]|u[0-9a-fA-F]{4})'
                },
                {
                    name: "invalid.illegal.escape.hyl",
                    match: "\\\\."
                },
                {
                    name: "meta.template.expression.hyl",
                    begin: "\\$\\{",
                    beginCaptures: { 0: { name: "punctuation.definition.template-expression.begin.hyl" } },
                    end: "\\}",
                    endCaptures: { 0: { name: "punctuation.definition.template-expression.end.hyl" } },
                    patterns: [{ include: "$self" }]
                }
            ]
        },
        number: {
            name: "constant.numeric.hyl",
            match: "\\b[0-9]+(?:\\.[0-9]+)?(?:[eE]-?[0-9]+)?"
        },
        access: {
            patterns: [
                {
                    match: `(\\.(?!\\.))[ \\t]*(?:${callableIdentifier})${callLookahead}`,
                    captures: {
                        1: { name: "punctuation.accessor.hyl" },
                        2: { name: "entity.name.function.hyl" },
                        3: { name: "entity.name.function.hyl" }
                    }
                },
                {
                    match: `(\\.(?!\\.))[ \\t]*(?:${identifier})`,
                    captures: {
                        1: { name: "punctuation.accessor.hyl" },
                        2: { name: "keyword.operator.hyl" },
                        3: { name: "variable.other.property.hyl" },
                        4: { name: "variable.other.property.hyl" }
                    }
                }
            ]
        },
        call: {
            match: `(?:${callableIdentifier})${callLookahead}`,
            captures: {
                1: { name: "entity.name.function.hyl" },
                2: { name: "entity.name.function.hyl" }
            }
        },
        identifier: {
            match: identifier,
            captures: {
                1: { name: "keyword.operator.hyl" },
                2: { name: "variable.other.hyl" },
                3: { name: "variable.other.hyl" }
            }
        },
        punctuation: {
            patterns: [
                { name: "punctuation.section.braces.hyl", match: "[{}]" },
                { name: "punctuation.section.parens.hyl", match: "[()]" },
                { name: "punctuation.section.brackets.hyl", match: "[\\[\\]]" },
                { name: "punctuation.separator.comma.hyl", match: "," }
            ]
        }
    }
};
