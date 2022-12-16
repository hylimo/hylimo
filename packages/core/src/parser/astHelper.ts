import { InterpreterContext } from "../runtime/interpreter";
import { BaseObject, FieldEntry } from "../runtime/objects/baseObject";
import { FullObject } from "../runtime/objects/fullObject";
import { generateArgs } from "../runtime/objects/function";
import { Type } from "../types/base";
import {
    AssignmentExpression,
    Expression,
    FunctionExpression,
    IdentifierExpression,
    InvocationArgument,
    NativeFunctionExpression,
    NativeFunctionType,
    NumberLiteralExpression,
    StringLiteralExpression
} from "./ast";
import { Parser } from "./parser";

/**
 * Helper function to create an IdentifierExpression without a position
 *
 * @param identifier the name of the identifier
 * @returns the created IdentifierExpression
 */
export function id(identifier: string): IdentifierExpression {
    return new IdentifierExpression(identifier);
}

/**
 * Helper function to create string literals
 *
 * @param value the value of the literal
 * @returns the created literal expression
 */
export function str(value: string): StringLiteralExpression {
    return new StringLiteralExpression(value);
}

/**
 * Helper function to create number literals
 *
 * @param value the value of the literal
 * @returns the created literal expression
 */
export function num(value: number): NumberLiteralExpression {
    return new NumberLiteralExpression(value);
}

/**
 * Helper function to create an AssignmentExpression without a target
 * (uses scope as target)
 *
 * @param field the name of the field to assign
 * @param value the new value of the field
 * @returns the created AssignmentExpression
 */
export function assign(field: string, value: Expression): AssignmentExpression {
    return new AssignmentExpression(field, undefined, value);
}

/**
 * Helper function to create an unnamed argument
 *
 * @param value the Expression used as the argument
 * @returns the created InvocationArgument
 */
export function arg(value: Expression): InvocationArgument {
    return {
        value
    };
}

/**
 * Helper function to create an named argument
 *
 * @param value the Expression used as the argument
 * @param name the name of the named argument
 * @returns the created InvocationArgument
 */
export function namedArg(name: string, value: Expression): InvocationArgument {
    return {
        name,
        value
    };
}

/**
 * Parsdes a set of decorators provided as object
 *
 * @param decorators the decorators before parsing
 * @returns the parsed decorators
 */
function parseDecorators(decorators: { [index: string]: string | null }): Map<string, string | undefined> {
    const parsedDecorators = new Map<string, string | undefined>();
    for (const [name, value] of Object.entries(decorators)) {
        parsedDecorators.set(name, value ?? undefined);
    }
    return parsedDecorators;
}

/**
 * Helper to parse function bodies
 */
const parser = new Parser(false);

/**
 * Helper to create a FunctionExpression
 *
 * @param expressions body of the function, if a string is provided it is parsed first
 * @param decorators decorators applied to the function
 * @param types argument types to check
 * @returns the created FunctionExpression
 */
export function fun(
    expressions: Expression[] | string,
    decorators: { [index: string]: string | null } = {},
    types?: Map<string | number, Type>
): FunctionExpression {
    let parsedExpressions: Expression[];
    if (typeof expressions === "string") {
        const parserResult = parser.parse(expressions);
        if (parserResult.lexingErrors.length > 0 || parserResult.parserErrors.length > 0) {
            throw new Error("Invalid fun to parse");
        }
        parsedExpressions = parserResult.ast!;
    } else {
        parsedExpressions = expressions;
    }
    return new FunctionExpression(parsedExpressions, parseDecorators(decorators), undefined, types);
}

/**
 * Helper to create a NativeFunctionExpression with already evaluated arguments
 *
 * @param callback executed to get the result of the function
 * @param decorators decorators applied to the function
 * @param types argument types to check
 * @returns the created FunctionExpression
 */
export function jsFun(
    callback: (args: FullObject, context: InterpreterContext) => BaseObject | FieldEntry,
    decorators: { [index: string]: string | null } = {},
    types?: Map<string | number, Type>
): NativeFunctionExpression {
    return new NativeFunctionExpression((args, context, staticScope) => {
        const evaluatedArgs = generateArgs(args, context, types);
        const oldScope = context.currentScope;
        context.currentScope = staticScope;
        const res = callback(evaluatedArgs, context);
        context.currentScope = oldScope;
        if (res instanceof BaseObject) {
            return { value: res };
        } else {
            return res;
        }
    }, parseDecorators(decorators));
}

/**
 * Helper to create a NativeFunctionExpression with already evaluated arguments
 *
 * @param callback executed to get the result of the function
 * @param decorators decorators applied to the function
 * @returns the created FunctionExpression
 */
export function native(
    callback: NativeFunctionType,
    decorators: { [index: string]: string | null } = {}
): NativeFunctionExpression {
    return new NativeFunctionExpression(callback, parseDecorators(decorators));
}
