import { CstNode, ICstVisitor, IToken } from "chevrotain";
import {
    AssignmentExpression,
    ASTExpressionPosition,
    DestructuringExpression,
    Expression,
    FieldAccessExpression,
    FunctionExpression,
    IdentifierExpression,
    InvocationArgument,
    InvocationExpression,
    LiteralExpression,
    NumberLiteralExpression,
    SelfInvocationExpression,
    StringLiteralExpression
} from "./ast";
import { Parser } from "./parser";

/**
 * Defines a function invocation
 */
type CallBracketsDefinition = [InvocationArgument[], ASTExpressionPosition];

/**
 *
 */
type AccessDefinition = {
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
};

/**
 * Generates the visitor which can transform the CST to an AST
 *
 * @param parser the parser for which the visitor is generated
 * @returns an instance of the visitor
 */
export function generateVisitor(parser: Parser): ICstVisitor<never, any> {
    /**
     * Helper to discard position information if parser does not allow tracking
     *
     * @param position the position to maybe return
     * @returns parser.astPositions ? position : undefined
     */
    function optionalPosition(position: ASTExpressionPosition): ASTExpressionPosition | undefined {
        if (parser.astPositions) {
            return position;
        } else {
            return undefined;
        }
    }

    /**
     * Helper which wraps generatePosition in optionalPosition.
     * Also returns undefined if start or end is undefined.
     *
     * @param start the start position
     * @param end the end position
     * @returns the combined start and end position or undefined
     */
    function generateOptionalPosition(
        start: ASTExpressionPosition,
        end: ASTExpressionPosition
    ): ASTExpressionPosition | undefined {
        if (start == undefined || end == undefined) {
            return undefined;
        }
        return optionalPosition(generatePosition(start, end));
    }

    /**
     * Visitor which visists each node and generates the AST based on it
     */
    class GenerateASTVisitor extends parser.getBaseCstVisitorConstructor<never, any>() {
        constructor() {
            super();
            this.validateVisitor();
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
                return new StringLiteralExpression(parseString(token.image), optionalPosition(token));
            } else {
                const token = ctx.Number[0];
                return new NumberLiteralExpression(parseNumber(token.image), optionalPosition(token));
            }
        }

        /**
         * Maps a function decorator
         *
         * @param ctx the children of the current CST node
         * @returns a map with all decorator entries and the start position of the decorator
         */
        private decorator(ctx: any): [Map<string, string | undefined>, ASTExpressionPosition] {
            const entries = (ctx.decoratorEntry ?? []).map((entry: CstNode) => this.visit(entry));
            return [
                entries.reduce((map: Map<string, string | undefined>, entry: any) => {
                    map.set(entry.name, entry.value);
                    return map;
                }, new Map<string, string | undefined>()),
                ctx.OpenSquareBracket[0]
            ];
        }

        /**
         * Maps a decorator entry
         *
         * @param ctx the children of the current CST node
         * @returns the created decorator entry consisting of name and value
         */
        private decoratorEntry(ctx: any): { name: string; value?: string } {
            let value = undefined;
            if (ctx.String) {
                value = parseString(ctx.String[0].image);
            }
            return {
                name: ctx.Identifier[0].image,
                value
            };
        }

        /**
         * Maps a function expression
         *
         * @param ctx the children of the current CST node
         * @returns the created function expression
         */
        private function(ctx: any): FunctionExpression {
            let decorator: Map<string, string | undefined>;
            let startPos: ASTExpressionPosition;
            if (ctx.decorator) {
                const decoratorRes = this.visit(ctx.decorator) as [any, ASTExpressionPosition];
                [decorator, startPos] = decoratorRes;
            } else {
                decorator = new Map();
                startPos = ctx.OpenCurlyBracket[0];
            }
            const expressions = this.visit(ctx.expressions);
            return new FunctionExpression(
                expressions,
                decorator,
                generateOptionalPosition(startPos, ctx.CloseCurlyBracket[0])
            );
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
         * Maps a call argument
         *
         * @param ctx the children of the current CST node
         * @returns the mapped InvocationArgument
         */
        private callArgument(ctx: any): InvocationArgument {
            let name = undefined;
            if (ctx.Identifier) {
                name = ctx.Identifier[0].image;
            }
            return {
                name,
                value: this.visit(ctx.operatorExpression)
            };
        }

        /**
         * Maps the brackets part of a function invokation
         *
         * @param ctx the children of the current CST node
         * @returns all invokation arguments and the end position of the call expression
         */
        private callBrackets(ctx: any): CallBracketsDefinition {
            const normalArguments = (ctx.callArgument ?? []).map((argument: CstNode) => this.visit(argument));
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
                baseExpression = new IdentifierExpression(token.image, optionalPosition(token));
            } else if (ctx.literal) {
                baseExpression = this.visit(ctx.literal);
            } else if (ctx.function) {
                baseExpression = this.visit(ctx.function);
            } else {
                baseExpression = this.visit(ctx.bracketExpression);
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
            const startPos = baseExpression.position!;
            for (let i = 0; i < callBrackets.length; i++) {
                const [args, endPos] = callBrackets[i];
                expression = new InvocationExpression(expression, args, generateOptionalPosition(startPos, endPos));
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
                identifierPosition: token,
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
            return this.visit(ctx.expression);
        }

        /**
         * Maps field accesses including call operators
         *
         * @param ctx the children of the current CST node
         * @returns the resulting expression
         */
        private fieldAccessExpression(ctx: any): Expression {
            let baseExpression = this.visit(ctx.callExpression);
            const startPos = baseExpression.position!;
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
                            generateOptionalPosition(startPos, endPos)
                        );
                        baseExpression = this.applyCallBrackets(baseExpression, remaining);
                    } else {
                        baseExpression = new FieldAccessExpression(
                            accessDefinition.identifier,
                            baseExpression,
                            generateOptionalPosition(startPos, accessDefinition.identifierPosition)
                        );
                    }
                }
            }
            return baseExpression;
        }

        /**
         * Maps a simple field access to an expression
         *
         * @param ctx the children of the current CST node
         * @returns the resulting expression
         */
        private simpleFieldAccessExpression(ctx: any): Expression {
            const identifiers: IToken[] = ctx.Identifier;
            let expression: Expression | undefined = undefined;
            for (const identifier of identifiers) {
                if (expression) {
                    expression = new FieldAccessExpression(
                        identifier.image,
                        expression,
                        generateOptionalPosition(expression.position!, identifier as ASTExpressionPosition)
                    );
                } else {
                    expression = new IdentifierExpression(
                        identifier.image,
                        optionalPosition(identifier as ASTExpressionPosition)
                    );
                }
            }
            return expression!;
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
                const rightHandSide = expressions[i + 1];
                expression = new InvocationExpression(
                    operators[i],
                    [{ value: expression }, { value: rightHandSide }],
                    generateOptionalPosition(startPos, rightHandSide.position)
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
                generateOptionalPosition(ctx.OpenRoundBracket[0], expression.position)
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
                    const position = generateOptionalPosition(target.position, value.position);
                    if (target instanceof IdentifierExpression) {
                        return new AssignmentExpression(target.identifier, undefined, value, position);
                    } else if (target instanceof FieldAccessExpression) {
                        return new AssignmentExpression(target.name as string, target.target, value, position);
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
function generatePosition(start: ASTExpressionPosition, end: ASTExpressionPosition): ASTExpressionPosition {
    return {
        startOffset: start.startOffset,
        startLine: start.startLine,
        startColumn: start.startColumn,
        endOffset: end.endOffset,
        endLine: end.endLine,
        endColumn: end.endColumn
    };
}
