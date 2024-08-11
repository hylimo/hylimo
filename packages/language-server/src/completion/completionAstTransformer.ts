import {
    AssignmentExpression,
    CompletionExpressionMetadata,
    Expression,
    FieldAccessExpression,
    IdentifierExpression,
    NumberLiteralExpression,
    SelfInvocationExpression
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
                return new ExecutableCompletionExpression(expression, this.visit(expression.target));
            } else {
                return new ExecutableCompletionExpression(expression);
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
            return new ExecutableCompletionExpression(expression, this.visit(expression.target));
        } else {
            return super.visitFieldAccessExpression(expression);
        }
    }

    override visitIdentifierExpression(expression: IdentifierExpression): ExecutableExpression<any> {
        if (this.isInCompletionRange(expression)) {
            return new ExecutableCompletionExpression(expression);
        } else {
            return super.visitIdentifierExpression(expression);
        }
    }

    override visitSelfInvocationExpression(expression: SelfInvocationExpression): ExecutableExpression<any> {
        if (this.isInCompletionRange(expression)) {
            return new ExecutableCompletionExpression(expression, this.visit(expression.target));
        } else {
            return super.visitSelfInvocationExpression(expression);
        }
    }

    /**
     * Checks if the given expression is in the completion range
     *
     * @param expression the expression to check
     * @returns true if the expression is in the completion range
     */
    private isInCompletionRange(expression: Expression<CompletionExpressionMetadata>): boolean {
        const range = expression.metadata.completionPosition;
        if (range == undefined) {
            return false;
        }
        return range.startOffset < this.position && this.position <= range.endOffset;
    }
}
