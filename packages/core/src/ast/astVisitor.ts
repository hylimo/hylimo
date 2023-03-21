import { StringLiteralExpression } from "./stringLiteralExpression";
import { SelfInvocationExpression } from "./selfInvocationExpression";
import { NumberLiteralExpression } from "./numberLiteralExpression";
import { InvocationExpression } from "./invocationExpression";
import { IdentifierExpression } from "./identifierExpression";
import { FunctionExpression } from "./functionExpression";
import { FieldAccessExpression } from "./fieldAccessExpression";
import { DestructuringExpression } from "./destructuringExpression";
import { BracketExpression } from "./bracketExpression";
import { AssignmentExpression } from "./assignmentExpression";
import { Expression } from "./expression";

/**
 * Visitor to transform an AST.
 * Override the visit methods to transform the AST.
 *
 * @param C the type of the context
 * @param O the type of the result
 */
export abstract class ASTVisitor<C, O> {
    /**
     * Visits an expression
     *
     * @param expression the expression to visit
     * @param context provided context
     * @returns the result of the visit
     */
    visit(expression: Expression, context: C): O {
        switch (expression.type) {
            case AssignmentExpression.TYPE:
                return this.visitAssignmentExpression(expression as AssignmentExpression, context);
            case BracketExpression.TYPE:
                return this.visitBracketExpression(expression as BracketExpression, context);
            case DestructuringExpression.TYPE:
                return this.visitDestructoringExpression(expression as DestructuringExpression, context);
            case FieldAccessExpression.TYPE:
                return this.visitFieldAccessExpression(expression as FieldAccessExpression, context);
            case FunctionExpression.TYPE:
                return this.visitFunctionExpression(expression as FunctionExpression, context);
            case IdentifierExpression.TYPE:
                return this.visitIdentifierExpression(expression as IdentifierExpression, context);
            case InvocationExpression.TYPE:
                return this.visitInvocationExpression(expression as InvocationExpression, context);
            case NumberLiteralExpression.TYPE:
                return this.visitNumberLiteralExpression(expression as NumberLiteralExpression, context);
            case SelfInvocationExpression.TYPE:
                return this.visitSelfInvocationExpression(expression as SelfInvocationExpression, context);
            case StringLiteralExpression.TYPE:
                return this.visistStringLiteralExpression(expression as StringLiteralExpression, context);
            default:
                throw new Error(`Unknown expression type ${expression.type}`);
        }
    }

    abstract visitAssignmentExpression(expression: AssignmentExpression, context: C): O;
    abstract visitBracketExpression(expression: BracketExpression, context: C): O;
    abstract visitDestructoringExpression(expression: DestructuringExpression, context: C): O;
    abstract visitFieldAccessExpression(expression: FieldAccessExpression, context: C): O;
    abstract visitFunctionExpression(expression: FunctionExpression, context: C): O;
    abstract visitIdentifierExpression(expression: IdentifierExpression, context: C): O;
    abstract visitInvocationExpression(expression: InvocationExpression, context: C): O;
    abstract visitNumberLiteralExpression(expression: NumberLiteralExpression, context: C): O;
    abstract visitSelfInvocationExpression(expression: SelfInvocationExpression, context: C): O;
    abstract visistStringLiteralExpression(expression: StringLiteralExpression, context: C): O;
}
