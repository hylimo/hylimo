import { LiteralExpression } from "../../ast/literalExpression";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable LiteralExpression
 */
export abstract class ExecutableLiteralExpression<T extends LiteralExpression<any>> extends ExecutableExpression<T> {
    /**
     * Creates a new ExecutableLiteralExpression
     *
     * @param expression the expression this represents
     * @param value the value of the literal
     */
    constructor(expression: T | undefined, readonly value: T["value"]) {
        super(expression);
    }
}
