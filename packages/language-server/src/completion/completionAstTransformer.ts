import {
    AssignmentExpression,
    CompletionExpressionMetadata,
    ExecutableNumberLiteralExpression,
    Expression,
    FieldAccessExpression,
    IdentifierExpression,
    NumberLiteralExpression,
    FieldSelfInvocationExpression
} from "@hylimo/core";
import { ExecutableExpression } from "@hylimo/core";
import { RuntimeAstTransformer } from "@hylimo/core";
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
            if (expression.target != undefined) {
                return new ExecutableCompletionExpression(expression, true, this.visit(expression.target));
            } else {
                return new ExecutableCompletionExpression(expression, false);
            }
        } else {
            return super.visitAssignmentExpression(expression);
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

    override visitFieldSelfInvocationExpression(expression: FieldSelfInvocationExpression): ExecutableExpression<any> {
        if (this.isInCompletionRange(expression)) {
            return new ExecutableCompletionExpression(expression, true, this.visit(expression.target));
        } else {
            return super.visitFieldSelfInvocationExpression(expression);
        }
    }

    override visitNoopExpression(): ExecutableExpression<any> {
        return new ExecutableNumberLiteralExpression(undefined, 0);
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
