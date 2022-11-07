import {
    AssignmentExpression,
    Expression,
    FunctionExpression,
    IdentifierExpression,
    InvocationArgument,
    NumberLiteralExpression,
    StringLiteralExpression
} from "./ast";

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
 * Helper to create a FunctionExpression
 *
 * @param expressions body of the function
 * @param decorators decorators applied to the function
 * @returns the created FunctionExpression
 */
export function fun(expressions: Expression[], decorators: { [index: string]: string | null }): FunctionExpression {
    const parsedDecorators = new Map<string, string | undefined>();
    for (const [name, value] of Object.entries(decorators)) {
        parsedDecorators.set(name, value ?? undefined);
    }
    return new FunctionExpression(expressions, parsedDecorators);
}
