import { StringLiteralExpression } from "../ast/stringLiteralExpression.js";
import { FieldSelfInvocationExpression } from "../ast/fieldSelfInvocationExpression.js";
import { NumberLiteralExpression } from "../ast/numberLiteralExpression.js";
import { InvocationExpression } from "../ast/invocationExpression.js";
import { ListEntry } from "../ast/listEntry.js";
import { IdentifierExpression } from "../ast/identifierExpression.js";
import { FunctionExpression } from "../ast/functionExpression.js";
import { FieldAccessExpression } from "../ast/fieldAccessExpression.js";
import { DestructuringExpression } from "../ast/destructuringExpression.js";
import { BracketExpression } from "../ast/bracketExpression.js";
import { AssignmentExpression } from "../ast/assignmentExpression.js";
import { Expression } from "../ast/expression.js";
import { ASTVisitor } from "../ast/astVisitor.js";
import { ExecutableListEntry } from "./ast/executableListEntry.js";
import { ExecutableAssignmentExpression } from "./ast/executableAssignmentExpression.js";
import { ExecutableBracketExpression } from "./ast/executableBracketExpression.js";
import { ExecutableDestructuringExpression } from "./ast/executableDestructuringExpression.js";
import { ExecutableExpression } from "./ast/executableExpression.js";
import { ExecutableFieldAccessExpression } from "./ast/executableFieldAccessExpression.js";
import { ExecutableFunctionExpression } from "./ast/executableFunctionExpression.js";
import { ExecutableIdentifierExpression } from "./ast/executableIdentifierExpression.js";
import { ExecutableInvocationExpression } from "./ast/executableInvocationExpression.js";
import { ExecutableFieldSelfInvocationExpression } from "./ast/executableFieldSelfInvocationExpression.js";
import { ExecutableStringLiteralExpression } from "./ast/executableStringLiteralExpression.js";
import { ObjectExpression } from "../ast/objectExpression.js";
import { ExecutableObjectExpression } from "./ast/executableObjectExpression.js";
import { OperatorExpression } from "../ast/operatorExpression.js";
import { ExecutableOperatorExpression } from "./ast/executableOperatorExpression.js";
import { IndexExpression } from "../ast/indexExpression.js";
import { ExecutableIndexExpression } from "./ast/executableIndexExpression.js";
import { IndexSelfInvocationExpression } from "../ast/indexSelfInvocationExpression.js";
import { ExecutableIndexSelfInvocationExpression } from "./ast/executableIndexSelfInvocationExpression.js";
import { FieldAssignmentExpression } from "../ast/fieldAssignmentExpression.js";
import { ExecutableFieldAssignmentExpression } from "./ast/executableFieldAssignmentExpression.js";
import { IndexAssignmentExpression } from "../ast/indexAssignmentExpression.js";
import { ExecutableIndexAssignmentExpression } from "./ast/executableIndexAssignmentExpression.js";
import { ExecutableConstExpression } from "./ast/executableConstExpression.js";
import { NumberObject } from "./objects/numberObject.js";
import { StringObject } from "./objects/stringObject.js";

/**
 * Transforms the AST into an executable AST
 */
export class RuntimeAstTransformer extends ASTVisitor<undefined, ExecutableExpression<any>> {
    /**
     * Creates a new RuntimeAstTransformer
     *
     * @param keepExpression if true, the created executable expression will keep the original expression
     */
    constructor(private readonly keepExpression: boolean) {
        super();
    }

    override visitAssignmentExpression(expression: AssignmentExpression): ExecutableExpression<any> {
        return new ExecutableAssignmentExpression(
            this.optionalExpression(expression),
            this.visit(expression.value),
            expression.name
        );
    }

    override visitFieldAssignmentExpression(expression: FieldAssignmentExpression): ExecutableExpression<any> {
        return new ExecutableFieldAssignmentExpression(
            this.optionalExpression(expression),
            this.visit(expression.target),
            this.visit(expression.value),
            expression.name
        );
    }

    override visitIndexAssignmentExpression(expression: IndexAssignmentExpression): ExecutableExpression<any> {
        return new ExecutableIndexAssignmentExpression(
            this.optionalExpression(expression),
            this.visit(expression.target),
            this.visit(expression.value),
            this.visit(expression.index)
        );
    }

    override visitBracketExpression(expression: BracketExpression): ExecutableExpression<any> {
        return new ExecutableBracketExpression(this.optionalExpression(expression), this.visit(expression.expression));
    }

    override visitDestructoringExpression(expression: DestructuringExpression): ExecutableExpression<any> {
        return new ExecutableDestructuringExpression(
            this.optionalExpression(expression),
            this.visit(expression.value),
            expression.names
        );
    }

    override visitFieldAccessExpression(expression: FieldAccessExpression): ExecutableExpression<any> {
        return new ExecutableFieldAccessExpression(
            this.optionalExpression(expression),
            this.visit(expression.target),
            expression.name
        );
    }

    override visitIndexExpression(expression: IndexExpression): ExecutableExpression<any> {
        return new ExecutableIndexExpression(
            this.optionalExpression(expression),
            this.visit(expression.target),
            this.visit(expression.index)
        );
    }

    override visitFunctionExpression(expression: FunctionExpression): ExecutableExpression<any> {
        return new ExecutableFunctionExpression(
            this.optionalExpression(expression),
            expression.expressions.map(this.visit.bind(this)),
            undefined
        );
    }

    override visitIdentifierExpression(expression: IdentifierExpression): ExecutableExpression<any> {
        return new ExecutableIdentifierExpression(this.optionalExpression(expression), expression.identifier);
    }

    override visitInvocationExpression(expression: InvocationExpression): ExecutableExpression<any> {
        return new ExecutableInvocationExpression(
            this.optionalExpression(expression),
            this.generateListEntries(expression.argumentExpressions),
            this.visit(expression.target)
        );
    }

    override visitNumberLiteralExpression(expression: NumberLiteralExpression): ExecutableExpression<any> {
        return new ExecutableConstExpression({
            value: new NumberObject(expression.value),
            source: this.optionalExpression(expression)
        });
    }

    override visitFieldSelfInvocationExpression(expression: FieldSelfInvocationExpression): ExecutableExpression<any> {
        return new ExecutableFieldSelfInvocationExpression(
            this.optionalExpression(expression),
            this.generateListEntries(expression.argumentExpressions),
            this.visit(expression.target),
            expression.name
        );
    }

    override visitIndexSelfInvocationExpression(expression: IndexSelfInvocationExpression): ExecutableExpression<any> {
        return new ExecutableIndexSelfInvocationExpression(
            this.optionalExpression(expression),
            this.generateListEntries(expression.argumentExpressions),
            this.visit(expression.target),
            this.visit(expression.index)
        );
    }

    override visistStringLiteralExpression(expression: StringLiteralExpression): ExecutableExpression<any> {
        const parts = expression.parts;
        if (parts.length === 1 && "content" in parts[0]) {
            return new ExecutableConstExpression({
                value: new StringObject(parts[0].content),
                source: this.optionalExpression(expression)
            });
        }
        return new ExecutableStringLiteralExpression(
            this.optionalExpression(expression),
            expression.parts.map((part) => {
                if ("content" in part) {
                    return { content: part.content };
                } else {
                    return { expression: this.visit(part.expression) };
                }
            })
        );
    }

    override visitObjectExpression(expression: ObjectExpression): ExecutableExpression<any> {
        return new ExecutableObjectExpression(
            this.optionalExpression(expression),
            this.generateListEntries(expression.fields)
        );
    }

    override visitOperatorExpression(expression: OperatorExpression): ExecutableExpression<any> {
        return new ExecutableOperatorExpression(
            this.optionalExpression(expression),
            this.visit(expression.left),
            this.visit(expression.right),
            this.visit(expression.operator)
        );
    }

    override visitNoopExpression(): ExecutableExpression<any> {
        throw new Error("NoopExpression cannot be transformed to executable expression.");
    }

    override visit(expression: Expression): ExecutableExpression<any> {
        return super.visit(expression, undefined);
    }

    /**
     * Maps the provided list entries to executable list entries
     *
     * @param args the list entries to map
     * @returns the mapped list entries
     */
    protected generateListEntries(args: ListEntry[]): ExecutableListEntry[] {
        return args.map((arg) => {
            return {
                name: arg.name,
                value: this.visit(arg.value)
            };
        });
    }

    /**
     * Returns the provided expression if keepExpression is true, otherwise undefined
     *
     * @param expression the expression to return if keepExpression is true
     * @returns the provided expression if keepExpression is true, otherwise undefined
     */
    protected optionalExpression<T extends Expression>(expression: T): T | undefined {
        return this.keepExpression ? expression : undefined;
    }
}
