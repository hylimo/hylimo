import { ICstVisitor, CstNode, IToken } from "chevrotain";
import { StringLiteralExpression } from "../ast/stringLiteralExpression.js";
import { SelfInvocationExpression } from "../ast/selfInvocationExpression.js";
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
import { ASTExpressionPosition } from "../ast/astExpressionPosition.js";
import { CompletionExpressionMetadata, ExpressionMetadata } from "../ast/expressionMetadata.js";
import { Parser } from "./parser.js";
import { ObjectExpression } from "../ast/objectExpression.js";

/**
 * Defines a function invocation
 */
type CallBracketsDefinition = [ListEntry[], ASTExpressionPosition];

/**
 * Defines an access with multiple possible call brackets
 */
interface AccessDefinition {
    /**
     * The accessed fields
     */
    identifier: string;
    /**
     * Position of the identifier
     */
    identifierPosition: ASTExpressionPosition;
    /**
     * Defines applied function invocations (0..n)
     */
    callBrackets: CallBracketsDefinition[];
}

export function generateCstToAstTransfromer(parser: Parser): ICstVisitor<never, any> {
    /**
     * Helper which wraps generatePosition in metadata and optionalPosition.
     * Takes the
     * Also returns undefined if start or end is undefined.
     *
     * @param start the start position
     * @param end the end position
     * @returns the combined start and end position or undefined
     */
    function generateMetadata(
        start: ASTExpressionPosition | IToken,
        end: ASTExpressionPosition | IToken
    ): ExpressionMetadata {
        const position = generatePosition(start, end);

        return {
            position,
            isEditable: true
        };
    }

    /**
     * Calls generateMetadata. Also adds the completionPosition and identifierPosition based on the provided identifier
     *
     * @param start the start position
     * @param end the end position
     * @returns the combined start and end position or undefined
     */
    function generateCompletionMetadata(
        start: ASTExpressionPosition | IToken,
        end: ASTExpressionPosition | IToken,
        identifierPosition: IToken | ASTExpressionPosition
    ): CompletionExpressionMetadata {
        const position = generatePosition(identifierPosition, identifierPosition);
        return {
            ...generateMetadata(start, end),
            completionPosition: position,
            identifierPosition: position
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
         * @returns all invocation arguments and the end position of the call expression
         */
        private callBrackets(ctx: any): CallBracketsDefinition {
            const normalArguments = (ctx.listEntry ?? []).map((argument: CstNode) => this.visit(argument));
            const functions = (ctx.function ?? []).map((func: CstNode) => ({
                value: this.visit(func)
            }));
            let endPosition;
            if (functions.length > 0) {
                endPosition = functions.at(-1).value.position;
            } else {
                endPosition = ctx.CloseRoundBracket[0];
            }
            return [[...normalArguments, ...functions], endPosition];
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
            const startPos = baseExpression.position;
            for (let i = 0; i < callBrackets.length; i++) {
                const [args, endPos] = callBrackets[i];
                expression = new InvocationExpression(expression, args, generateMetadata(startPos, endPos));
            }
            return expression;
        }

        /**
         * Maps a call expression to an Expression
         *
         * @param ctx the children of the current CST node
         * @returns a definition of the field access
         */
        private simpleCallExpression(ctx: any): AccessDefinition {
            const token = ctx.Identifier[0];
            return {
                identifier: token.image,
                identifierPosition: generatePosition(token, token),
                callBrackets: (ctx.callBrackets ?? []).map((brackets: CstNode) => this.visit(brackets))
            };
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
            const startPos = baseExpression.position;
            if (ctx.simpleCallExpression) {
                const accessDefininitions: AccessDefinition[] = ctx.simpleCallExpression.map((exp: CstNode) =>
                    this.visit(exp)
                );
                for (const accessDefinition of accessDefininitions) {
                    if (accessDefinition.callBrackets.length > 0) {
                        const [first, ...remaining] = accessDefinition.callBrackets;
                        const [args, endPos] = first;
                        baseExpression = new SelfInvocationExpression(
                            accessDefinition.identifier,
                            baseExpression,
                            args,
                            generateCompletionMetadata(startPos, endPos, accessDefinition.identifierPosition)
                        );
                        baseExpression = this.applyCallBrackets(baseExpression, remaining);
                    } else {
                        baseExpression = new FieldAccessExpression(
                            accessDefinition.identifier,
                            baseExpression,
                            generateCompletionMetadata(
                                startPos,
                                accessDefinition.identifierPosition,
                                accessDefinition.identifierPosition
                            )
                        );
                    }
                }
            }
            if (ctx.FaultTolerantToken) {
                return this.generateFieldAccessExpressionForOnlyDot(baseExpression, ctx.FaultTolerantToken[0]);
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
                        generateCompletionMetadata(expression.position, identifier, identifier)
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
            const dotPosition = generatePosition(dotToken, dotToken);
            return new FieldAccessExpression("", baseExpression, {
                ...generateMetadata(baseExpression.position, dotToken),
                completionPosition: dotPosition,
                identifierPosition: {
                    startOffset: dotPosition.endOffset,
                    startLine: dotPosition.endLine,
                    startColumn: dotPosition.endColumn,
                    endOffset: dotPosition.endOffset,
                    endLine: dotPosition.endLine,
                    endColumn: dotPosition.endColumn
                }
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
            const startPos = expression.position;
            const operators = (ctx.simpleFieldAccessExpression ?? []).map((operator: CstNode) => this.visit(operator));
            for (let i = 0; i < operators.length; i++) {
                const operator = operators[i];
                const rightHandSide = expressions[i + 1];
                expression = new InvocationExpression(
                    operator,
                    [{ value: expression }, { value: rightHandSide }].filter((arg) => arg.value != undefined),
                    generateMetadata(startPos, rightHandSide?.position ?? operator.position)
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
                generateMetadata(ctx.OpenRoundBracket[0], expression.position)
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
                    const targetMeta = target.metadata as CompletionExpressionMetadata;
                    const meta: CompletionExpressionMetadata = {
                        ...generateMetadata(target.position, value.position),
                        completionPosition: targetMeta.completionPosition,
                        identifierPosition: targetMeta.identifierPosition
                    };
                    if (target instanceof IdentifierExpression) {
                        return new AssignmentExpression(target.identifier, undefined, value, meta);
                    } else if (target instanceof FieldAccessExpression) {
                        return new AssignmentExpression(target.name as string, target.target, value, meta);
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
 * Generates a new position from a start and end position
 *
 * @param start the start position
 * @param end the end position
 * @returns the combined start and end position
 */
function generatePosition(
    start: ASTExpressionPosition | IToken,
    end: ASTExpressionPosition | IToken
): ASTExpressionPosition {
    let startPos: Pick<ASTExpressionPosition, "startOffset" | "startLine" | "startColumn">;
    if ("image" in start) {
        startPos = {
            startOffset: start.startOffset,
            startLine: start.startLine! - 1,
            startColumn: start.startColumn! - 1
        };
    } else {
        startPos = start;
    }
    let endPos: Pick<ASTExpressionPosition, "endOffset" | "endLine" | "endColumn">;
    if ("image" in end) {
        endPos = {
            endOffset: end.endOffset! + 1,
            endLine: end.endLine! - 1,
            endColumn: end.endColumn!
        };
    } else {
        endPos = end;
    }
    return {
        startOffset: startPos.startOffset,
        startLine: startPos.startLine,
        startColumn: startPos.startColumn,
        endOffset: endPos.endOffset,
        endLine: endPos.endLine,
        endColumn: endPos.endColumn
    };
}
