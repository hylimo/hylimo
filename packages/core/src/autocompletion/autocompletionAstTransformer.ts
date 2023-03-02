import {
    AssignmentExpression,
    Expression,
    FieldAccessExpression,
    IdentifierExpression,
    NumberLiteralExpression,
    SelfInvocationExpression
} from "../ast/ast";
import { AutocompletionExpressionMetadata } from "../ast/expressionMetadata";
import { ExecutableExpression } from "../runtime/ast/executableExpression";
import { RuntimeAstTransformer } from "../runtime/runtimeAstTransformer";
import { ExecutableAutocompletionExpression } from "./executableAutocompletionExpression";

/**
 * Transforms the AST into an executable AST where autocompletion expressions are replaced with
 * ExecutableAutocompletionExpressions if they are in the autocompletion range.
 */
export class AutocompletionAstTransformer extends RuntimeAstTransformer {
    /**
     * Creates a new AutocompletionAstTransformer
     *
     * @param position the position in the source code where the autocompletion is requested
     */
    constructor(private readonly position: number) {
        super();
    }

    override visitAssignmentExpression(expression: AssignmentExpression): ExecutableExpression<any> {
        if (this.isInAutocompletionRange(expression)) {
            if (expression.target != undefined) {
                return new ExecutableAutocompletionExpression(expression, this.visit(expression.target));
            } else {
                return new ExecutableAutocompletionExpression(expression);
            }
        } else {
            return super.visitAssignmentExpression(expression);
        }
    }

    override visitFieldAccessExpression(expression: FieldAccessExpression): ExecutableExpression<any> {
        if (
            this.isInAutocompletionRange(expression) &&
            (!(expression.target instanceof NumberLiteralExpression) || expression.name !== "")
        ) {
            return new ExecutableAutocompletionExpression(expression, this.visit(expression.target));
        } else {
            return super.visitFieldAccessExpression(expression);
        }
    }

    override visitIdentifierExpression(expression: IdentifierExpression): ExecutableExpression<any> {
        if (this.isInAutocompletionRange(expression)) {
            return new ExecutableAutocompletionExpression(expression);
        } else {
            return super.visitIdentifierExpression(expression);
        }
    }

    override visitSelfInvocationExpression(expression: SelfInvocationExpression): ExecutableExpression<any> {
        if (this.isInAutocompletionRange(expression)) {
            return new ExecutableAutocompletionExpression(expression, this.visit(expression.target));
        } else {
            return super.visitSelfInvocationExpression(expression);
        }
    }

    /**
     * Checks if the given expression is in the autocompletion range
     *
     * @param expression the expression to check
     * @returns true if the expression is in the autocompletion range
     */
    private isInAutocompletionRange(expression: Expression<AutocompletionExpressionMetadata>): boolean {
        const range = expression.metadata.autocompletionPosition;
        if (range == undefined) {
            return false;
        }
        return range.startOffset < this.position && this.position <= range.endOffset;
    }
}
