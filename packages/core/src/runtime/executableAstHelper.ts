import { AbstractInvocationExpression } from "../ast/abstractInvocationExpression.js";
import { Expression } from "../ast/expression.js";
import { ExecutableAssignmentExpression } from "./ast/executableAssignmentExpression.js";
import { ExecutableExpression } from "./ast/executableExpression.js";
import { ExecutableIdentifierExpression } from "./ast/executableIdentifierExpression.js";
import { ExecutableNativeFunctionExpression, NativeFunctionType } from "./ast/executableNativeFunctionExpression.js";
import { ExecutableNumberLiteralExpression } from "./ast/executableNumberLiteralExpression.js";
import { ExecutableStringLiteralExpression } from "./ast/executableStringLiteralExpression.js";
import { InterpreterContext } from "./interpreter/interpreterContext.js";
import { BaseObject, FieldEntry } from "./objects/baseObject.js";
import { FullObject } from "./objects/fullObject.js";
import { generateArgs } from "./objects/functionObject.js";
import { RuntimeAstTransformer } from "./runtimeAstTransformer.js";
import { Parser } from "../parser/parser.js";
import { ExecutableFunctionExpression } from "./ast/executableFunctionExpression.js";
import { ExecutableNativeExpression } from "./ast/executableNativeExpression.js";
import { ListEntry } from "../ast/listEntry.js";
import { FunctionDocumentation } from "./ast/executableAbstractFunctionExpression.js";

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
export function arg(value: Expression): ListEntry {
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
export function namedArg(name: string, value: Expression): ListEntry {
    return {
        name,
        value
    };
}

/**
 * Helper to parse function bodies
 */
const parser = new Parser();

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
    return toExecutable(parserResult.ast!, false);
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
    documentation?: FunctionDocumentation
): ExecutableFunctionExpression {
    let parsedExpressions: ExecutableExpression[];
    if (typeof expressions === "string") {
        parsedExpressions = parse(expressions);
    } else {
        parsedExpressions = expressions;
    }
    return new ExecutableFunctionExpression(undefined, parsedExpressions, documentation);
}

/**
 * Helper to create a NativeFunctionExpression with already evaluated arguments
 *
 * @param callback executed to get the result of the function
 * @param documentation the documentation of the function
 * @returns the created FunctionExpression
 */
export function jsFun(
    callback: (
        args: FullObject,
        context: InterpreterContext,
        callExpression: AbstractInvocationExpression | undefined
    ) => BaseObject | FieldEntry,
    documentation?: FunctionDocumentation
): ExecutableNativeFunctionExpression {
    return new ExecutableNativeFunctionExpression((args, context, staticScope, callExpression) => {
        const evaluatedArgs = generateArgs(args, context, documentation);
        const oldScope = context.currentScope;
        context.currentScope = staticScope;
        const res = callback(evaluatedArgs, context, callExpression);
        context.currentScope = oldScope;
        if (res instanceof BaseObject) {
            return { value: res };
        } else {
            return res;
        }
    }, documentation);
}

/**
 * Helper to create a NativeFunctionExpression with already evaluated arguments
 *
 * @param callback executed to get the result of the function
 * @param documentation the documentation of the function
 * @returns the created FunctionExpression
 */
export function native(
    callback: NativeFunctionType,
    documentation?: FunctionDocumentation
): ExecutableNativeFunctionExpression {
    return new ExecutableNativeFunctionExpression(callback, documentation);
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
                object.setLocalField(key, { value: context.newString(value) }, context);
            } else {
                object.setLocalField(key, { value: context.newNumber(value) }, context);
            }
        }
        return { value: object };
    });
}

/**
 * Helper to map an AST to an executable AST
 */
const runtimeAstTransformers = new Map([
    [true, new RuntimeAstTransformer(true)],
    [false, new RuntimeAstTransformer(false)]
]);

/**
 * Maps an array of AST expressions to an array of executable expressions
 *
 * @param expressions the expressions to map
 * @param keepExpression if true, the executable expression has the original expression assigned
 * @returns the mapped expressions
 */
export function toExecutable(expressions: Expression[], keepExpression: boolean): ExecutableExpression<any>[] {
    return expressions.map((expression) => runtimeAstTransformers.get(keepExpression)!.visit(expression));
}
