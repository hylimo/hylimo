import { AbstractInvocationExpression } from "../ast/abstractInvocationExpression";
import { Expression } from "../ast/expression";
import { ExecutableAssignmentExpression } from "./ast/executableAssignmentExpression";
import { ExecutableExpression } from "./ast/executableExpression";
import { ExecutableIdentifierExpression } from "./ast/executableIdentifierExpression";
import { ExecutableNativeFunctionExpression, NativeFunctionType } from "./ast/executableNativeFunctionExpression";
import { ExecutableNumberLiteralExpression } from "./ast/executableNumberLiteralExpression";
import { ExecutableStringLiteralExpression } from "./ast/executableStringLiteralExpression";
import { InterpreterContext } from "./interpreter";
import { BaseObject, FieldEntry } from "./objects/baseObject";
import { FullObject } from "./objects/fullObject";
import { generateArgs } from "./objects/functionObject";
import { RuntimeAstTransformer } from "./runtimeAstTransformer";
import { Type } from "../types/base";
import { Parser } from "../parser/parser";
import { ExecutableFunctionExpression } from "./ast/executableFunctionExpression";
import { ExecutableNativeExpression } from "./ast/executableNativeExpression";
import { InvocationArgument } from "../ast/invocationExpression";

/**
 * Helper function to create an IdentifierExpression without a position
 *
 * @param identifier the name of the identifier
 * @returns the created IdentifierExpression
 */
export function id(identifier: string): ExecutableIdentifierExpression {
    return new ExecutableIdentifierExpression(undefined, identifier);
}

/**
 * Helper function to create string literals
 *
 * @param value the value of the literal
 * @returns the created literal expression
 */
export function str(value: string): ExecutableStringLiteralExpression {
    return new ExecutableStringLiteralExpression(undefined, value);
}

/**
 * Helper function to create number literals
 *
 * @param value the value of the literal
 * @returns the created literal expression
 */
export function num(value: number): ExecutableNumberLiteralExpression {
    return new ExecutableNumberLiteralExpression(undefined, value);
}

/**
 * Helper function to create an ExecutableAssignmentExpression without a target
 * (uses scope as target)
 *
 * @param field the name of the field to assign
 * @param value the new value of the field
 * @returns the created ExecutableAssignmentExpression
 */
export function assign(field: string, value: ExecutableExpression): ExecutableAssignmentExpression {
    return new ExecutableAssignmentExpression(undefined, undefined, value, field);
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
 * Helper to parse some expressions
 *
 * @param expressions the expressions to parse
 * @returns the parsed expressions
 */
export function parse(expressions: string): ExecutableExpression[] {
    const parserResult = parser.parse(expressions);
    if (parserResult.lexingErrors.length > 0 || parserResult.parserErrors.length > 0) {
        throw new Error("Invalid fun to parse");
    }
    return toExecutable(parserResult.ast!);
}

/**
 * Helper to create a ExecutableFunctionExpression
 *
 * @param expressions body of the function, if a string is provided it is parsed first
 * @param decorators decorators applied to the function
 * @param types argument types to check
 * @returns the created FunctionExpression
 */
export function fun(
    expressions: ExecutableExpression[] | string,
    decorators: { [index: string]: string | null } = {},
    types?: [string | number, Type][]
): ExecutableFunctionExpression {
    let parsedExpressions: ExecutableExpression[];
    if (typeof expressions === "string") {
        parsedExpressions = parse(expressions);
    } else {
        parsedExpressions = expressions;
    }
    return new ExecutableFunctionExpression(undefined, parsedExpressions, parseDecorators(decorators), new Map(types));
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
    callback: (
        args: FullObject,
        context: InterpreterContext,
        callExpression: AbstractInvocationExpression | undefined
    ) => BaseObject | FieldEntry,
    decorators: { [index: string]: string | null } = {},
    types?: [string | number, Type][]
): ExecutableNativeFunctionExpression {
    if (types) {
        for (const [key, type] of types) {
            if (type == undefined) {
                throw new Error(`Undefined type provided for key ${key}`);
            }
        }
    }
    return new ExecutableNativeFunctionExpression((args, context, staticScope, callExpression) => {
        const evaluatedArgs = generateArgs(args, context, new Map(types));
        const oldScope = context.currentScope;
        context.currentScope = staticScope;
        const res = callback(evaluatedArgs, context, callExpression);
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
): ExecutableNativeFunctionExpression {
    return new ExecutableNativeFunctionExpression(callback, parseDecorators(decorators));
}

/**
 * Helper to create an expression which evaluates to an enum, meaning an object whith the defined entries
 * Each entry does NOT have its source set
 *
 * @param entries the entries of the enum
 * @returns the created expression which evaluates to the enum
 */
export function enumObject(entries: Record<string, string | number>): ExecutableNativeExpression {
    return new ExecutableNativeExpression((context) => {
        const object = context.newObject();
        for (const [key, value] of Object.entries(entries)) {
            if (typeof value === "string") {
                object.setLocalField(key, { value: context.newString(value) });
            } else {
                object.setLocalField(key, { value: context.newNumber(value) });
            }
        }
        return { value: object };
    });
}

/**
 * Helper to map an AST to an executable AST
 */
const runtimeAstTransformer = new RuntimeAstTransformer();

/**
 * Maps an array of AST expressions to an array of executable expressions
 *
 * @param expressions the expressions to map
 * @returns the mapped expressions
 */
export function toExecutable(expressions: Expression[]): ExecutableExpression<any>[] {
    return expressions.map((expression) => runtimeAstTransformer.visit(expression));
}
