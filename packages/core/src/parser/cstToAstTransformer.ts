import { ICstVisitor, CstNode, IToken } from "chevrotain";
import { StringLiteralExpression } from "../ast/stringLiteralExpression.js";
import { FieldSelfInvocationExpression } from "../ast/fieldSelfInvocationExpression.js";
import { NumberLiteralExpression } from "../ast/numberLiteralExpression.js";
import { LiteralExpression } from "../ast/literalExpression.js";
import { InvocationExpression } from "../ast/invocationExpression.js";
import { ListEntry } from "../ast/listEntry.js";
import { IdentifierExpression } from "../ast/identifierExpression.js";
import { FunctionExpression } from "../ast/functionExpression.js";
import { FieldAccessExpression } from "../ast/fieldAccessExpression.js";
import { DestructuringExpression } from "../ast/destructuringExpression.js";
import { BracketExpression } from "../ast/bracketExpression.js";
import { AssignmentExpression } from "../ast/assignmentExpression.js";
import { Expression } from "../ast/expression.js";
import { Range } from "../ast/range.js";
import { CompletionExpressionMetadata, ExpressionMetadata } from "../ast/expressionMetadata.js";
import { Parser } from "./parser.js";
import { ObjectExpression } from "../ast/objectExpression.js";
import { OperatorExpression } from "../ast/operatorExpression.js";
import { NoopExpression } from "../ast/noopExpression.js";
import { IndexExpression } from "../ast/indexExpression.js";
import { IndexSelfInvocationExpression } from "../ast/indexSelfInvocationExpression.js";
import { FieldAssignmentExpression } from "../ast/fieldAssignmentExpression.js";
import { IndexAssignmentExpression } from "../ast/indexAssignmentExpression.js";

/**
 * Defines a function invocation
 */
interface CallBracketsDefinition {
    /**
     * The inner arguments
     */
    inner: ListEntry[];
    /**
     * The trailing arguments
     */
    trailing: ListEntry[];
    /**
     * The end position of the invocation
     */
    endPos: Range;
    /**
     * The range of the parentheses
     * Undefined if no parentheses are present
     */
    parenthesisRange?: Range;
}

/**
 * Generator for an Expression which takes a base expression and returns the generated expression
 * Used to map simple call expressions to the AST
 */
type SimpleCallExpressionGenerator = (baseExpression: Expression) => Expression;

export function generateCstToAstTransfromer(parser: Parser): ICstVisitor<never, any> {
    /**
     * Helper which wraps generateRange in metadata and optionalRange.
     * Also returns undefined if start or end is undefined.
     *
     * @param start the start range
     * @param end the end range
     * @returns the combined start and end range or undefined
     */
    function generateMetadata(start: Range | IToken, end: Range | IToken): ExpressionMetadata {
        const range = generateRange(start, end);

        return {
            range: range,
            isEditable: true
        };
    }

    /**
     * Calls generateMetadata. Also adds the completionRange based on the provided completionRange.
     *
     * @param start the start range
     * @param end the end range
     * @param completionRange the range of the completion or the token which should be replaced
     * @returns the combined start and end range or undefined
     */
    function generateCompletionMetadata(
        start: Range | IToken,
        end: Range | IToken,
        completionRange: IToken | Range
    ): CompletionExpressionMetadata {
        const range = generateRange(completionRange, completionRange);
        return {
            ...generateMetadata(start, end),
            completionRange: range
        };
    }

    /**
     * Visitor which visists each node and generates the AST based on it
     */
    class GenerateASTVisitor extends parser.getBaseCstVisitorConstructor<never, any>() {
        constructor() {
            super();
            this.validateVisitor();
        }

        override visit(cstNode: CstNode | CstNode[]) {
            return super.visit(cstNode);
        }

        /**
         * Maps a literal
         *
         * @param ctx the children of the current CST node
         * @returns the created literal expression
         */
        private literal(ctx: any): LiteralExpression<any> {
            if (ctx.String) {
                const token = ctx.String[0];
                return new StringLiteralExpression(parseString(token.image), generateMetadata(token, token));
            } else {
                const token = ctx.Number[0];
                let value = parseNumber(token.image);
                let meta: ExpressionMetadata;
                if (ctx.SignMinus) {
                    value = -value;
                    meta = generateMetadata(ctx.SignMinus[0], token);
                } else {
                    meta = generateMetadata(token, token);
                }
                return new NumberLiteralExpression(value, meta);
            }
        }

        /**
         * Maps a function expression
         *
         * @param ctx the children of the current CST node
         * @returns the created function expression
         */
        private function(ctx: any): FunctionExpression {
            const startPos = ctx.OpenCurlyBracket[0];
            const expressions = this.visit(ctx.expressions);
            return new FunctionExpression(expressions, generateMetadata(startPos, ctx.CloseCurlyBracket[0]));
        }

        /**
         * Maps a list of expressions
         *
         * @param ctx the children of the current CST node
         * @returns an array of created expressions
         */
        private expressions(ctx: any): Expression[] {
            return (ctx.expression ?? []).map((exp: CstNode) => this.visit(exp));
        }

        /**
         * Maps a list entry
         *
         * @param ctx the children of the current CST node
         * @returns the mapped ListEntry
         */
        private listEntry(ctx: any): ListEntry {
            let name = undefined;
            if (ctx.Identifier) {
                name = ctx.Identifier[0].image;
            }
            return {
                name,
                value: this.visit(ctx.operatorExpression)
            };
        }

        private objectExpression(ctx: any): ObjectExpression {
            const entries = (ctx.listEntry ?? []).map((entry: CstNode) => this.visit(entry));
            return new ObjectExpression(entries, generateMetadata(ctx.OpenSquareBracket[0], ctx.CloseSquareBracket[0]));
        }

        /**
         * Maps the brackets part of a function invocation
         *
         * @param ctx the children of the current CST node
         * @returns all invocation arguments and the end range of the call expression
         */
        private callBrackets(ctx: any): CallBracketsDefinition {
            const normalArguments = (ctx.listEntry ?? []).map((argument: CstNode) => this.visit(argument));
            const functions = (ctx.function ?? []).map((func: CstNode) => ({
                value: this.visit(func)
            }));
            let endRange;
            if (functions.length > 0) {
                endRange = functions.at(-1).value.range;
            } else {
                endRange = ctx.CloseRoundBracket[0];
            }
            let parenthesisRange: Range | undefined = undefined;
            if (ctx.OpenRoundBracket) {
                parenthesisRange = generateRange(ctx.OpenRoundBracket[0], ctx.CloseRoundBracket[0]);
            }
            return {
                inner: normalArguments,
                trailing: functions,
                endPos: endRange,
                parenthesisRange
            };
        }

        /**
         * Maps a call expression to an Expression
         *
         * @param ctx the children of the current CST node
         * @returns the generated expression
         */
        private callExpression(ctx: any): Expression {
            let baseExpression;
            if (ctx.Identifier) {
                const token = ctx.Identifier[0];
                baseExpression = new IdentifierExpression(token.image, generateCompletionMetadata(token, token, token));
            } else if (ctx.literal) {
                baseExpression = this.visit(ctx.literal);
            } else if (ctx.function) {
                baseExpression = this.visit(ctx.function);
            } else if (ctx.bracketExpression) {
                baseExpression = this.visit(ctx.bracketExpression);
            } else {
                baseExpression = this.visit(ctx.objectExpression);
            }
            if (ctx.callBrackets) {
                baseExpression = this.applyCallBrackets(
                    baseExpression,
                    ctx.callBrackets.map((brackets: CstNode) => this.visit(brackets))
                );
            }
            return baseExpression;
        }

        /**
         * Applies a list of call brackets to an Expression
         *
         * @param baseExpression the initial expression
         * @param callBrackets the list of call brackets to apply
         * @returns the resulting Expression
         */
        private applyCallBrackets(baseExpression: Expression, callBrackets: CallBracketsDefinition[]): Expression {
            let expression = baseExpression;
            const startPos = baseExpression.range;
            let currentEndPos = startPos;
            for (let i = 0; i < callBrackets.length; i++) {
                const { inner, trailing, endPos } = callBrackets[i];
                expression = new InvocationExpression(expression, inner, trailing, {
                    ...generateMetadata(startPos, endPos),
                    parenthesisRange: this.calculateParenthesisRange(callBrackets[i], currentEndPos)
                });
                currentEndPos = endPos;
            }
            return expression;
        }

        /**
         * Calculates the range of the parenthesis of a call expression based on the definition
         * If there are no call brackets, falls back to a length 0 range directly after the target of the call
         *
         * @param callBacketsDefinition definition of the call brackets
         * @param targetRange range of the target of the call
         * @returns the range of the parenthesis
         */
        private calculateParenthesisRange(callBacketsDefinition: CallBracketsDefinition, targetRange: Range): Range {
            if (callBacketsDefinition.parenthesisRange) {
                return callBacketsDefinition.parenthesisRange;
            } else {
                return [targetRange[1], targetRange[1]];
            }
        }

        /**
         * Maps a simple call expression to a generator for an Expression
         * The generated expression depends on whether there are any call brackets,
         * and whether the expression is a field access or an index expression.
         *
         * @param ctx the children of the current CST node
         * @returns a generator for the expression
         */
        private simpleCallExpression(ctx: any): SimpleCallExpressionGenerator {
            const callBrackets = (ctx.callBrackets ?? []).map((brackets: CstNode) => this.visit(brackets));
            let identifier: IToken | undefined = undefined;
            let index: Expression | undefined = undefined;
            if (ctx.expression) {
                index = this.visit(ctx.expression[0]);
            } else {
                identifier = ctx.Identifier[0];
            }
            return (baseExpression) => {
                if (identifier != undefined) {
                    return this.handleIdentifierSimpleCallExpression(ctx, identifier, callBrackets, baseExpression);
                } else if (index != undefined) {
                    return this.handleIndexSimpleCallExpression(ctx, index, callBrackets, baseExpression);
                } else {
                    throw Error("Invalid simple call expression");
                }
            };
        }

        /**
         * Handles a simple call expression with an identifier
         *
         * @param ctx the children of the current CST node
         * @param identifier the identifier token to handle
         * @param callBrackets the call brackets to apply
         * @param baseExpression the base expression to apply the call brackets to
         * @returns the resulting expression
         */
        private handleIdentifierSimpleCallExpression(
            ctx: any,
            identifier: IToken,
            callBrackets: CallBracketsDefinition[],
            baseExpression: Expression
        ): Expression {
            const startPos = baseExpression.range;
            const dot = ctx.Dot[0];
            const completionRange = generateRange(dot, identifier);
            if (callBrackets.length > 0) {
                const [first, ...remaining] = callBrackets;
                const { inner, trailing, endPos: endRange } = first;
                const invocationExpression = new FieldSelfInvocationExpression(
                    identifier.image,
                    baseExpression,
                    inner,
                    trailing,
                    {
                        ...generateCompletionMetadata(startPos, endRange, completionRange),
                        parenthesisRange: this.calculateParenthesisRange(first, completionRange)
                    }
                );
                return this.applyCallBrackets(invocationExpression, remaining);
            } else {
                return new FieldAccessExpression(
                    identifier.image,
                    baseExpression,
                    generateCompletionMetadata(startPos, completionRange, completionRange)
                );
            }
        }

        /**
         * Handles a simple call expression with an index
         *
         * @param ctx the children of the current CST node
         * @param index the index expression to handle
         * @param callBrackets the call brackets to apply
         * @param baseExpression the base expression to apply the call brackets to
         * @returns the resulting expression
         */
        private handleIndexSimpleCallExpression(
            ctx: any,
            index: Expression,
            callBrackets: CallBracketsDefinition[],
            baseExpression: Expression
        ): Expression {
            const startPos = baseExpression.range;
            const indexRange = generateRange(ctx.OpenSquareBracket[0], ctx.CloseSquareBracket[0]);
            if (callBrackets.length > 0) {
                const [first, ...remaining] = callBrackets;
                const { inner, trailing, endPos: endRange } = first;
                const invocationExpression = new IndexSelfInvocationExpression(index, baseExpression, inner, trailing, {
                    ...generateMetadata(startPos, endRange),
                    parenthesisRange: this.calculateParenthesisRange(first, indexRange)
                });
                return this.applyCallBrackets(invocationExpression, remaining);
            } else {
                return new IndexExpression(index, baseExpression, generateMetadata(startPos, indexRange));
            }
        }

        /**
         * Maps a bracket expression
         *
         * @param ctx the children of the current CST node
         * @returns the inner expression
         */
        private bracketExpression(ctx: any) {
            const innerExpression = this.visit(ctx.expression);
            return new BracketExpression(
                innerExpression,
                generateMetadata(ctx.OpenRoundBracket[0], ctx.CloseRoundBracket[0])
            );
        }

        /**
         * Maps field accesses including call operators
         *
         * @param ctx the children of the current CST node
         * @returns the resulting expression
         */
        private fieldAccessExpression(ctx: any): Expression {
            let baseExpression = this.visit(ctx.callExpression);
            if (ctx.simpleCallExpression) {
                const expressionGenerators: SimpleCallExpressionGenerator[] = ctx.simpleCallExpression.map(
                    (exp: CstNode) => this.visit(exp)
                );

                for (const generator of expressionGenerators) {
                    baseExpression = generator(baseExpression);
                }
            }
            if (ctx.FaultTolerantToken) {
                return this.generateFieldAccessExpressionForOnlyDot(baseExpression, ctx.FaultTolerantToken);
            } else {
                return baseExpression;
            }
        }

        /**
         * Maps a simple field access to an expression
         *
         * @param ctx the children of the current CST node
         * @returns the resulting expression
         */
        private simpleFieldAccessExpression(ctx: any): Expression {
            const identifiers: IToken[] = ctx.Identifier ?? [];
            if (ctx.SignMinus) {
                identifiers.push(...ctx.SignMinus);
            }
            let expression: Expression | undefined = undefined;
            for (const identifier of identifiers) {
                if (expression) {
                    expression = new FieldAccessExpression(
                        identifier.image,
                        expression,
                        generateCompletionMetadata(expression.range, identifier, identifier)
                    );
                } else {
                    expression = new IdentifierExpression(
                        identifier.image,
                        generateCompletionMetadata(identifier, identifier, identifier)
                    );
                }
            }
            if (ctx.FaultTolerantToken) {
                return this.generateFieldAccessExpressionForOnlyDot(expression!, ctx.FaultTolerantToken[0]);
            } else {
                return expression!;
            }
        }

        /**
         * Generates a field access expression for a dot without the right side
         *
         * @param baseExpression the left side expression
         * @param dotToken the token of the dot
         * @returns the generated FieldAccessExpression
         */
        private generateFieldAccessExpressionForOnlyDot(baseExpression: Expression, dotToken: IToken): Expression {
            const dotRange = generateRange(dotToken, dotToken);
            return new FieldAccessExpression("", baseExpression, {
                ...generateMetadata(baseExpression.range, dotToken),
                completionRange: dotRange
            });
        }

        /**
         * Maps an operator expression
         *
         * @param ctx the children of the current CST node
         * @returns the resulting expression
         */
        private operatorExpression(ctx: any): Expression {
            const expressions = ctx.fieldAccessExpression.map((exp: CstNode) => this.visit(exp));
            let expression = expressions[0];
            const startPos = expression.range;
            const operators = (ctx.simpleFieldAccessExpression ?? []).map((operator: CstNode) => this.visit(operator));
            for (let i = 0; i < operators.length; i++) {
                const operator = operators[i];
                const rightHandSide = expressions[i + 1];
                expression = new OperatorExpression(
                    operator,
                    expression,
                    rightHandSide ?? new NoopExpression(),
                    generateMetadata(startPos, rightHandSide?.range ?? operator.range)
                );
            }
            return expression;
        }

        /**
         * Maps a destructuring expression
         *
         * @param ctx the children of the current CST node
         * @returns the resulting expression
         */
        private destructuringExpression(ctx: any): Expression {
            const expression = this.visit(ctx.operatorExpression);
            return new DestructuringExpression(
                ctx.Identifier.map((identifier: IToken) => identifier.image),
                expression,
                generateMetadata(ctx.OpenRoundBracket[0], expression.range)
            );
        }

        /**
         * Maps an expression
         *
         * @param ctx the children of the current CST node
         * @returns the resulting expression
         */
        private expression(ctx: any): Expression {
            if (ctx.destructuringExpression) {
                return this.visit(ctx.destructuringExpression);
            } else {
                const expressions = ctx.operatorExpression.map((exp: CstNode) => this.visit(exp));
                if (expressions.length > 1) {
                    const target = expressions[0];
                    const value = expressions[1];
                    const meta = generateMetadata(target.range, value.range);
                    if (target instanceof IdentifierExpression) {
                        return new AssignmentExpression(target.identifier, value, {
                            ...meta,
                            completionRange: target.metadata.completionRange
                        });
                    } else if (target instanceof FieldAccessExpression) {
                        return new FieldAssignmentExpression(target.name, target.target, value, {
                            ...meta,
                            completionRange: target.metadata.completionRange
                        });
                    } else if (target instanceof IndexExpression) {
                        return new IndexAssignmentExpression(target.index, target.target, value, meta);
                    } else {
                        throw Error("invalid assignment target");
                    }
                } else {
                    return expressions[0];
                }
            }
        }
    }
    return new GenerateASTVisitor();
}

/**
 * Parses a string
 * Removes quotes and handles escapes
 *
 * @param value the string to parse
 * @returns the parsed string
 */
function parseString(value: string): string {
    let res = "";
    for (let i = 1; i < value.length - 1; i++) {
        const char = value[i];
        if (char == "\\") {
            i++;
            const newChar = value[i];
            switch (newChar) {
                case "n":
                    res += "\n";
                    break;
                case "\\":
                    res += "\\";
                    break;
                case "t":
                    res += "\t";
                    break;
                case '"':
                    res += '"';
                    break;
                case "u": {
                    const code = value.substring(i + 1, i + 5);
                    res += String.fromCharCode(parseInt(code, 16));
                    i += 4;
                }
            }
        } else {
            res += char;
        }
    }
    return res;
}

/**
 * Parses a number
 *
 * @param value the value to parse
 * @returns the parsed number
 */
function parseNumber(value: string): number {
    return parseFloat(value);
}

/**
 * Generates a new range from a start and end range
 *
 * @param start the start range
 * @param end the end range
 * @returns the combined start and end range
 */
function generateRange(start: Range | IToken, end: Range | IToken): Range {
    let startPos: number;
    if ("image" in start) {
        startPos = start.startOffset;
    } else {
        startPos = start[0];
    }
    let endPos: number;
    if ("image" in end) {
        endPos = end.endOffset! + 1;
    } else {
        endPos = end[1];
    }
    return [startPos, endPos];
}
