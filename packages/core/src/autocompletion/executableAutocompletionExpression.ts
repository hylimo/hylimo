import { Expression } from "../ast/ast";
import { AutocompletionExpressionMetadata } from "../ast/expressionMetadata";
import { ExecutableExpression } from "../runtime/ast/executableExpression";
import { InterpreterContext } from "../runtime/interpreter";
import { AutocompletionError } from "./autocompletionError";

/**
 * An expression which throws an AutocompletionError on evaluation
 */
export class ExecutableAutocompletionExpression extends ExecutableExpression<
    Expression<AutocompletionExpressionMetadata>
> {
    /**
     * Creates a new ExecutableAutocompletionExpression
     *
     * @param expression the expression this represents
     * @param context evaluated and thrown as AutocompletionError, if undefined, the current scope is used
     */
    constructor(
        expression: Expression<AutocompletionExpressionMetadata>,
        readonly context?: ExecutableExpression<any>
    ) {
        super(expression);
    }

    evaluateInternal(context: InterpreterContext): never {
        if (this.context != undefined) {
            const autocompletionContext = this.context.evaluate(context);
            throw new AutocompletionError(autocompletionContext.value, this.expression);
        } else {
            throw new AutocompletionError(context.currentScope, this.expression);
        }
    }
}
