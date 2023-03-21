import { StringLiteralExpression } from "../ast/stringLiteralExpression";
import { SelfInvocationExpression } from "../ast/selfInvocationExpression";
import { NumberLiteralExpression } from "../ast/numberLiteralExpression";
import { InvocationArgument, InvocationExpression } from "../ast/invocationExpression";
import { IdentifierExpression } from "../ast/identifierExpression";
import { FunctionExpression } from "../ast/functionExpression";
import { FieldAccessExpression } from "../ast/fieldAccessExpression";
import { DestructuringExpression } from "../ast/destructuringExpression";
import { BracketExpression } from "../ast/bracketExpression";
import { AssignmentExpression } from "../ast/assignmentExpression";
import { Expression } from "../ast/expression";
import { ASTVisitor } from "../ast/astVisitor";
import { ExecutableInvocationArgument } from "./ast/executableAbstractInvocationExpression";
import { ExecutableAssignmentExpression } from "./ast/executableAssignmentExpression";
import { ExecutableBracketExpression } from "./ast/executableBracketExpression";
import { ExecutableDestructuringExpression } from "./ast/executableDestructuringExpression";
import { ExecutableExpression } from "./ast/executableExpression";
import { ExecutableFieldAccessExpression } from "./ast/executableFieldAccessExpression";
import { ExecutableFunctionExpression } from "./ast/executableFunctionExpression";
import { ExecutableIdentifierExpression } from "./ast/executableIdentifierExpression";
import { ExecutableInvocationExpression } from "./ast/executableInvocationExpression";
import { ExecutableNumberLiteralExpression } from "./ast/executableNumberLiteralExpression";
import { ExecutableSelfInvocationExpression } from "./ast/executableSelfInvocationExpression";
import { ExecutableStringLiteralExpression } from "./ast/executableStringLiteralExpression";

/**
 * Transforms the AST into an executable AST
 */
export class RuntimeAstTransformer extends ASTVisitor<undefined, ExecutableExpression<any>> {
    override visitAssignmentExpression(expression: AssignmentExpression): ExecutableExpression<any> {
        return new ExecutableAssignmentExpression(
            expression,
            this.visitOptional(expression.target),
            this.visit(expression.value),
            expression.name
        );
    }

    override visitBracketExpression(expression: BracketExpression): ExecutableExpression<any> {
        return new ExecutableBracketExpression(expression, this.visit(expression.expression));
    }

    override visitDestructoringExpression(expression: DestructuringExpression): ExecutableExpression<any> {
        return new ExecutableDestructuringExpression(expression, this.visit(expression.value), expression.names);
    }

    override visitFieldAccessExpression(expression: FieldAccessExpression): ExecutableExpression<any> {
        return new ExecutableFieldAccessExpression(expression, this.visit(expression.target), expression.name);
    }

    override visitFunctionExpression(expression: FunctionExpression): ExecutableExpression<any> {
        return new ExecutableFunctionExpression(
            expression,
            expression.expressions.map(this.visit.bind(this)),
            expression.decorator
        );
    }

    override visitIdentifierExpression(expression: IdentifierExpression): ExecutableExpression<any> {
        return new ExecutableIdentifierExpression(expression, expression.identifier);
    }

    override visitInvocationExpression(expression: InvocationExpression): ExecutableExpression<any> {
        return new ExecutableInvocationExpression(
            expression,
            this.generateInvocationArguments(expression.argumentExpressions),
            this.visit(expression.target)
        );
    }

    override visitNumberLiteralExpression(expression: NumberLiteralExpression): ExecutableExpression<any> {
        return new ExecutableNumberLiteralExpression(expression, expression.value);
    }

    override visitSelfInvocationExpression(expression: SelfInvocationExpression): ExecutableExpression<any> {
        return new ExecutableSelfInvocationExpression(
            expression,
            this.generateInvocationArguments(expression.argumentExpressions),
            this.visit(expression.target),
            expression.name
        );
    }

    override visistStringLiteralExpression(expression: StringLiteralExpression): ExecutableExpression<any> {
        return new ExecutableStringLiteralExpression(expression, expression.value);
    }

    override visit(expression: Expression): ExecutableExpression<any> {
        return super.visit(expression, undefined);
    }

    /**
     * If the expression is undefined, returns undefined, otherwise visits the expression
     *
     * @param expression the optional expression to visit
     * @returns the visited expression or undefined
     */
    private visitOptional(expression: Expression | undefined): ExecutableExpression<any> | undefined {
        return expression ? this.visit(expression) : undefined;
    }

    /**
     * Maps the provided invocation arguments to executable invocation arguments
     *
     * @param args the invocation arguments to map
     * @returns the mapped invocation arguments
     */
    private generateInvocationArguments(args: InvocationArgument[]): ExecutableInvocationArgument[] {
        return args.map((arg) => {
            return {
                name: arg.name,
                value: this.visit(arg.value)
            };
        });
    }
}
