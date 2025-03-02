import type {
    AssignmentExpression,
    CompletionExpressionMetadata,
    Expression,
    FieldAccessExpression,
    FieldSelfInvocationExpression,
    IndexSelfInvocationExpression,
    InvocationExpression,
    AbstractInvocationExpression,
    ExecutableExpression,
    FieldAssignmentExpression
} from "@hylimo/core";
import { IdentifierExpression, NumberLiteralExpression, RuntimeAstTransformer, num } from "@hylimo/core";
import { CompletableFieldSelfInvocationExpression } from "./completableFieldSelfInvocationExpression.js";
import { CompletableIndexSelfInvocationExpression } from "./completableIndexSelfInvocationExpression.js";
import { CompletableInvocationExpression } from "./completableInvocationExpression.js";
import { ExecutableCompletionExpression } from "./executableCompletionExpression.js";

/**
 * Transforms the AST into an executable AST where completion expressions are replaced with
 * ExecutableCompletionExpressions if they are in the completion range.
 */
export class CompletionAstTransformer extends RuntimeAstTransformer {
    /**
     * Creates a new CompletionAstTransformer
     *
     * @param position the position in the source code where the completion is requested
     */
    constructor(private readonly position: number) {
        super(true);
    }

    override visitAssignmentExpression(expression: AssignmentExpression): ExecutableExpression<any> {
        if (this.isInCompletionRange(expression)) {
            return new ExecutableCompletionExpression(expression, false);
        } else {
            return super.visitAssignmentExpression(expression);
        }
    }

    override visitFieldAssignmentExpression(expression: FieldAssignmentExpression): ExecutableExpression<any> {
        if (this.isInCompletionRange(expression)) {
            return new ExecutableCompletionExpression(expression, true, this.visit(expression.target));
        } else {
            return super.visitFieldAssignmentExpression(expression);
        }
    }

    override visitFieldAccessExpression(expression: FieldAccessExpression): ExecutableExpression<any> {
        if (
            this.isInCompletionRange(expression) &&
            (!(expression.target instanceof NumberLiteralExpression) || expression.name !== "")
        ) {
            return new ExecutableCompletionExpression(expression, true, this.visit(expression.target));
        } else {
            return super.visitFieldAccessExpression(expression);
        }
    }

    override visitIdentifierExpression(expression: IdentifierExpression): ExecutableExpression<any> {
        if (this.isInCompletionRange(expression)) {
            return new ExecutableCompletionExpression(expression, false);
        } else {
            return super.visitIdentifierExpression(expression);
        }
    }

    /**
     * Override 'test(…)' so that we can autocomplete documented named params declared by 'test'
     */
    override visitInvocationExpression(expression: InvocationExpression): ExecutableExpression<any> {
        if (this.isEditingArgumentName(expression)) {
            return new CompletableInvocationExpression(
                this.optionalExpression(expression),
                this.generateListEntries(expression.argumentExpressions),
                this.visit(expression.target)
            );
        }
        return super.visitInvocationExpression(expression);
    }

    /**
     * Override 'this["test"](…)' so that we can autocomplete documented named params declared by 'test'
     */
    override visitIndexSelfInvocationExpression(expression: IndexSelfInvocationExpression): ExecutableExpression<any> {
        if (this.isEditingArgumentName(expression)) {
            return new CompletableIndexSelfInvocationExpression(
                this.optionalExpression(expression),
                this.generateListEntries(expression.argumentExpressions),
                this.visit(expression.target),
                this.visit(expression.index)
            );
        }
        return super.visitIndexSelfInvocationExpression(expression);
    }

    /**
     * Override 'test.hello(…)' so that we can autocomplete documented named params declared by 'hello'
     */
    override visitFieldSelfInvocationExpression(expression: FieldSelfInvocationExpression): ExecutableExpression<any> {
        if (this.isEditingArgumentName(expression)) {
            return new CompletableFieldSelfInvocationExpression(
                this.optionalExpression(expression),
                this.generateListEntries(expression.argumentExpressions),
                this.visit(expression.target),
                expression.name
            );
        }
        if (this.isInCompletionRange(expression)) {
            return new ExecutableCompletionExpression(expression, true, this.visit(expression.target));
        }
        return super.visitFieldSelfInvocationExpression(expression);
    }

    /**
     * Checks whether the user is currently editing any of the inner arguments of an expression that may be a named argument (is an identifier).
     *
     * @param func the function expression to check
     * @return true when named arguments should be suggested
     */
    isEditingArgumentName(func: AbstractInvocationExpression): boolean {
        return func.innerArgumentExpressions.some(
            (arg) => arg.value instanceof IdentifierExpression && this.isInCompletionRange(arg.value)
        );
    }

    override visitNoopExpression(): ExecutableExpression<any> {
        return num(0);
    }

    /**
     * Checks if the given expression is in the completion range
     *
     * @param expression the expression to check
     * @returns true if the expression is in the completion range
     */
    private isInCompletionRange(expression: Expression<CompletionExpressionMetadata>): boolean {
        const range = expression.metadata.completionRange;
        if (range == undefined) {
            return false;
        }
        return range[0] < this.position && this.position <= range[1];
    }
}
