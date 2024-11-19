import { Rules } from "@hylimo/core";
import { IToken } from "chevrotain";
import { doc, Doc } from "prettier";
import { uinteger } from "vscode-languageserver";
import { PrintContext, Path, Print } from "./types.js";
import { printDanglingComments } from "./comments.js";

const { group, indent, join, line, hardline, softline } = doc.builders;

/**
 * Lookup for printers for each CST node
 */
export const printers: Record<Rules, ({ ctx, path, print }: PrintContext) => Doc> = {
    literal: printLiteral,
    stringPart: printStringPart,
    function: printFunction,
    expressions: printExpressions,
    listEntry: printListEntry,
    callBrackets: printCallBrackets,
    objectExpression: printObjectExpression,
    callExpression: printCallExpression,
    simpleCallExpression: printSimpleCallExpression,
    bracketExpression: printBracketExpression,
    fieldAccessExpression: printFieldAccessExpression,
    simpleFieldAccessExpression: printSimpleFieldAccessExpression,
    operatorExpression: printOperatorExpression,
    destructuringExpression: printDestructuringExpression,
    expression: printExpression
};

/**
 * Formats a literal
 *
 * @param ctx the children of the current CST node
 * @returns the formatteed literal
 */
function printLiteral({ ctx, path, print }: PrintContext): Doc {
    if (ctx.StringStart) {
        return ['"', ...path.map(print, Rules.STRING_PART), '"'];
    } else {
        const token = ctx.Number[0] as IToken;
        if (ctx.SignMinus) {
            return "-" + token.image;
        } else {
            return token.image;
        }
    }
}

/**
 * Formats a string part
 *
 * @param context prettier print context
 * @returns the formatted string part
 */
function printStringPart({ ctx, path, print }: PrintContext): Doc {
    if (ctx.StringContent) {
        return ctx.StringContent[0].image;
    } else {
        return group(["${", indent([softline, ...path.map(print, Rules.EXPRESSION)]), softline, "}"]);
    }
}

/**
 * Formats a function expression
 *
 * @param context prettier print context
 * @returns the formatted function expression
 */
function printFunction({ ctx, path, print, options }: PrintContext): Doc {
    const children: Doc = [printDanglingComments(path, options)];
    let newLine: Doc = line;
    if (ctx.expressions != undefined) {
        const expressions = ctx.expressions?.[0];
        newLine = expressions?.StartNewLine ? hardline : line;
        children.push(...path.map(print, Rules.EXPRESSIONS));
    }
    return group(["{", indent([newLine, children]), newLine, "}"]);
}

/**
 * Formats a list of expressions
 *
 * @param context prettier print context
 * @returns the formatted list of expressions
 */
function printExpressions({ ctx, path, print, options }: PrintContext): Doc {
    if (ctx.expression == undefined) {
        return printDanglingComments(path, options);
    }
    let lastLine = uinteger.MAX_VALUE;
    return path.map((expression: any, i: number) => {
        const location = expression.node.location;
        const docs: Doc[] = [];
        if (location.startLine > lastLine + 1) {
            docs.push(hardline);
        }
        docs.push(print(expression));
        if (i < ctx.expression.length - 1) {
            docs.push(hardline);
        }
        lastLine = location!.endLine!;
        return docs;
    }, Rules.EXPRESSION);
}

/**
 * Formats a list entry
 *
 * @param context prettier print context
 * @returns the formatted call argument
 */
function printListEntry({ ctx, path, print }: PrintContext): Doc {
    if (ctx.Identifier) {
        return [ctx.Identifier[0].image, " = ", path.map(print, Rules.OPERATOR_EXPRESSION)];
    } else {
        return path.map(print, Rules.OPERATOR_EXPRESSION);
    }
}

/**
 * Formats the brackets part of a function invocation
 *
 * @param context prettier print context
 * @returns the formatted call brackets
 */
function printCallBrackets(context: PrintContext): Doc {
    const { ctx, path, print } = context;
    const allBrackets: Doc[] = [];
    if (ctx.OpenRoundBracket) {
        allBrackets.push(group(["(", indent([softline, printInnerListEntries(context)]), softline, ")"]));
    }
    if (ctx.function) {
        allBrackets.push(...path.map(print, Rules.FUNCTION));
    }
    return join(" ", allBrackets);
}

/**
 * Formats an object expression
 *
 * @param context prettier print context
 * @returns the formatted object expression
 */
function printObjectExpression(context: PrintContext): Doc {
    return group(["[", indent([softline, printInnerListEntries(context)]), softline, "]"]);
}

/**
 * Prints the inner list entrires comma separated
 * If no list entries are present, prints the dangling comments
 *
 * @param context the print context
 * @returns the formatted inner list entries
 */
function printInnerListEntries({ ctx, path, print, options }: PrintContext): Doc {
    if (ctx.listEntry != undefined) {
        const args = path.map(print, Rules.LIST_ENTRY);
        return join([",", line], args);
    } else {
        return printDanglingComments(path, options);
    }
}

/**
 * Formats a call expression to an Expression
 *
 * @param context prettier print context
 * @returns the formatted call expression
 */
function printCallExpression(context: PrintContext): Doc {
    const { ctx, path, print } = context;
    let baseExpression: Doc;
    if (ctx.Identifier != undefined) {
        baseExpression = ctx.Identifier[0].image;
    } else if (ctx.literal != undefined) {
        baseExpression = path.map(print, Rules.LITERAL);
    } else if (ctx.function != undefined) {
        baseExpression = path.map(print, Rules.FUNCTION);
    } else if (ctx.bracketExpression != undefined) {
        baseExpression = path.map(print, Rules.BRACKET_EXPRESSION);
    } else {
        baseExpression = path.map(print, Rules.OBJECT_EXPRESSION);
    }
    return applyCallBrackets(context, baseExpression);
}

/**
 * Formats a simple call expression
 *
 * @param context prettier print context
 * @returns the formatted simple call expression
 */
function printSimpleCallExpression(context: PrintContext): Doc {
    const { ctx, path, print } = context;
    let baseExpression: Doc;
    if (ctx.Identifier != undefined) {
        baseExpression = [".", ctx.Identifier[0].image];
    } else {
        baseExpression = group(["[", indent([softline, path.map(print, Rules.EXPRESSION)]), softline, "]"]);
    }
    return applyCallBrackets(context, baseExpression);
}

/**
 * Applies optional call brackets to the base expression
 *
 * @param context prettier print context
 * @param baseExpression the base expression
 * @returns the base expression with optional call brackets
 */
function applyCallBrackets({ ctx, path, print }: PrintContext, baseExpression: Doc): Doc {
    if (ctx.callBrackets != undefined) {
        const docs = [baseExpression];
        if (ctx.callBrackets[0].OpenRoundBracket == undefined) {
            docs.push(" ");
        }
        docs.push(path.map(print, Rules.CALL_BRACKETS));
        return docs;
    } else {
        return baseExpression;
    }
}

/**
 * Formats a bracket expression
 *
 * @param context prettier print context
 * @returns the inner expression
 */
function printBracketExpression({ path, print }: PrintContext) {
    return group(["(", indent([softline, path.map(print, Rules.EXPRESSION)]), softline, ")"]);
}

/**
 * Formats field accesses including call operators
 *
 * @param context prettier print context
 * @returns the formatted fieldAccessExpression
 */
function printFieldAccessExpression({ ctx, path, print }: PrintContext): Doc {
    const docs: Doc[] = [path.map(print, Rules.CALL_EXPRESSION)];
    if (ctx.simpleCallExpression != undefined) {
        docs.push(...path.map(print, Rules.SIMPLE_CALL_EXPRESSION));
    }
    return docs;
}

/**
 * Formats a simple field access to an expression
 *
 * @param context prettier print context
 * @returns the formatted expression
 */
function printSimpleFieldAccessExpression({ ctx }: PrintContext): Doc {
    const docs: Doc[] = [];
    if (ctx.SignMinus != undefined) {
        docs.push(ctx.SignMinus[0].image);
    }
    docs.push(...ctx.Identifier.map((token: IToken) => token.image));
    return join(".", docs);
}

/**
 * Formats an operator expression
 *
 * @param context prettier print context
 * @returns the formatted expression
 */
function printOperatorExpression({ path, print }: PrintContext): Doc {
    const expressions = mapIfDefined(path, print, Rules.FIELD_ACCESS_EXPRESSION);
    const operators = mapIfDefined(path, print, Rules.SIMPLE_FIELD_ACCESS_EXPRESSION);
    const res: Doc[] = [expressions[0]];
    for (let i = 0; i < operators.length; i++) {
        res.push(operators[i], expressions[i + 1]);
    }
    return join(" ", res);
}

/**
 * Formats a destructuring expression
 *
 * @param context prettier print context
 * @returns the formatted expression
 */
function printDestructuringExpression({ ctx, path, print }: PrintContext): Doc {
    const entries = ctx.Identifier.map((token: IToken) => token.image);
    return [
        group(["(", indent([softline, join([",", line], entries)]), softline, ")"]),
        " = ",
        path.map(print, Rules.OPERATOR_EXPRESSION)
    ];
}

/**
 * Formats an expression
 *
 * @param context prettier print context
 * @returns the formatted expression
 */
function printExpression({ ctx, path, print }: PrintContext): Doc {
    if (ctx.destructuringExpression != undefined) {
        return path.map(print, Rules.DESTRUCTURING_EXPRESSION);
    } else {
        const expressions = path.map(print, Rules.OPERATOR_EXPRESSION);
        return join(" = ", expressions);
    }
}

/**
 * If key is defined on the current CST node, map the children present under the key
 *
 * @param path the current path
 * @param print the print function
 * @param key the key to map
 * @returns the mapping result
 */
function mapIfDefined(path: Path, print: Print, key: Rules): Doc[] {
    const ctx = path.node;
    if (ctx[key] != undefined) {
        return path.map(print, key);
    }
    return [];
}
