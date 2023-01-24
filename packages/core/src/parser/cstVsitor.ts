import { CstNode, ICstVisitor, IToken } from "chevrotain";
import {
    AssignmentExpression,
    ASTExpressionPosition,
    DestructuringExpression,
    Expression,
    ExpressionMetadata,
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

/**
 * Parameters defining if the current visited expression is editable
 */
export interface CstVisitorParameters {
    /**
     * If true, the expression is editable
     */
    editable: boolean;
}

export function generateVisitor(parser: Parser): ICstVisitor<CstVisitorParameters, any> {
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
     * Helper to generate metadata based on the parameters and a position
     *
     * @param position the position for the metadata
     * @param params the parameters required for generating the Metadata
     * @returns the generated metadata
     */
    function metadata(position: ASTExpressionPosition | undefined, params: CstVisitorParameters): ExpressionMetadata {
        return {
            position,
            isEditable: params.editable && position != undefined
        };
    }

    /**
     * Helper which wraps generatePosition in metadata and optionalPosition.
     * Takes the
     * Also returns undefined if start or end is undefined.
     *
     * @param start the start position
     * @param end the end position
     * @param params the parameters required for generating the Metadata
     * @returns the combined start and end position or undefined
     */
    function generateMetadata(
        start: ASTExpressionPosition,
        end: ASTExpressionPosition,
        params: CstVisitorParameters
    ): ExpressionMetadata {
        if (start == undefined || end == undefined) {
            return metadata(undefined, params);
        }
        return metadata(optionalPosition(generatePosition(start, end)), params);
    }

    /**
     * Visitor which visists each node and generates the AST based on it
     */
    class GenerateASTVisitor extends parser.getBaseCstVisitorConstructor<CstVisitorParameters, any>() {
        constructor() {
            super();
            this.validateVisitor();
        }

        override visit(cstNode: CstNode | CstNode[], param?: CstVisitorParameters | undefined) {
            if (param == undefined) {
                throw new Error("Parameters are required");
            }
            return super.visit(cstNode, param);
        }

        /**
         * Maps a literal
         *
         * @param ctx the children of the current CST node
         * @param params parameter context which must be passed at visit
         * @returns the created literal expression
         */
        private literal(ctx: any, params: CstVisitorParameters): LiteralExpression<any> {
            if (ctx.String) {
                const token = ctx.String[0];
                return new StringLiteralExpression(parseString(token.image), metadata(optionalPosition(token), params));
            } else {
                const token = ctx.Number[0];
                let value = parseNumber(token.image);
                let meta: ExpressionMetadata;
                if (ctx.SignMinus) {
                    value = -value;
                    meta = generateMetadata(ctx.SignMinus[0], token, params);
                } else {
                    meta = metadata(optionalPosition(token), params);
                }
                return new NumberLiteralExpression(value, meta);
            }
        }

        /**
         * Maps a function decorator
         *
         * @param ctx the children of the current CST node
         * @param params parameter context which must be passed at visit
         * @returns a map with all decorator entries and the start position of the decorator
         */
        private decorator(
            ctx: any,
            params: CstVisitorParameters
        ): [Map<string, string | undefined>, ASTExpressionPosition] {
            const entries = (ctx.decoratorEntry ?? []).map((entry: CstNode) => this.visit(entry, params));
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
         * @param params parameter context which must be passed at visit
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
         * @param params parameter context which must be passed at visit
         * @returns the created function expression
         */
        private function(ctx: any, params: CstVisitorParameters): FunctionExpression {
            let decorator: Map<string, string | undefined>;
            let startPos: ASTExpressionPosition;
            if (ctx.decorator) {
                const decoratorRes = this.visit(ctx.decorator, params) as [any, ASTExpressionPosition];
                [decorator, startPos] = decoratorRes;
            } else {
                decorator = new Map();
                startPos = ctx.OpenCurlyBracket[0];
            }
            const expressions = this.visit(ctx.expressions, { editable: params.editable && !decorator.has("noedit") });
            return new FunctionExpression(
                expressions,
                decorator,
                generateMetadata(startPos, ctx.CloseCurlyBracket[0], params)
            );
        }

        /**
         * Maps a list of expressions
         *
         * @param ctx the children of the current CST node
         * @param params parameter context which must be passed at visit
         * @returns an array of created expressions
         */
        private expressions(ctx: any, params: CstVisitorParameters): Expression[] {
            return (ctx.expression ?? []).map((exp: CstNode) => this.visit(exp, params));
        }

        /**
         * Maps a call argument
         *
         * @param ctx the children of the current CST node
         * @param params parameter context which must be passed at visit
         * @returns the mapped InvocationArgument
         */
        private callArgument(ctx: any, params: CstVisitorParameters): InvocationArgument {
            let name = undefined;
            if (ctx.Identifier) {
                name = ctx.Identifier[0].image;
            }
            return {
                name,
                value: this.visit(ctx.operatorExpression, params)
            };
        }

        /**
         * Maps the brackets part of a function invokation
         *
         * @param ctx the children of the current CST node
         * @param params parameter context which must be passed at visit
         * @returns all invokation arguments and the end position of the call expression
         */
        private callBrackets(ctx: any, params: CstVisitorParameters): CallBracketsDefinition {
            const normalArguments = (ctx.callArgument ?? []).map((argument: CstNode) => this.visit(argument, params));
            const functions = (ctx.function ?? []).map((func: CstNode) => ({
                value: this.visit(func, params)
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
         * @param params parameter context which must be passed at visit
         * @returns the generated expression
         */
        private callExpression(ctx: any, params: CstVisitorParameters): Expression {
            let baseExpression;
            if (ctx.Identifier) {
                const token = ctx.Identifier[0];
                baseExpression = new IdentifierExpression(token.image, metadata(optionalPosition(token), params));
            } else if (ctx.literal) {
                baseExpression = this.visit(ctx.literal, params);
            } else if (ctx.function) {
                baseExpression = this.visit(ctx.function, params);
            } else {
                baseExpression = this.visit(ctx.bracketExpression, params);
            }
            if (ctx.callBrackets) {
                baseExpression = this.applyCallBrackets(
                    baseExpression,
                    ctx.callBrackets.map((brackets: CstNode) => this.visit(brackets, params)),
                    params
                );
            }
            return baseExpression;
        }

        /**
         * Applies a list of call brackets to an Expression
         *
         * @param baseExpression the initial expression
         * @param callBrackets the list of call brackets to apply
         * @param params parameter context which must be passed at visit
         * @returns the resulting Expression
         */
        private applyCallBrackets(
            baseExpression: Expression,
            callBrackets: CallBracketsDefinition[],
            params: CstVisitorParameters
        ): Expression {
            let expression = baseExpression;
            const startPos = baseExpression.metadata.position!;
            for (let i = 0; i < callBrackets.length; i++) {
                const [args, endPos] = callBrackets[i];
                expression = new InvocationExpression(expression, args, generateMetadata(startPos, endPos, params));
            }
            return expression;
        }

        /**
         * Maps a call expression to an Expression
         *
         * @param ctx the children of the current CST node
         * @param params parameter context which must be passed at visit
         * @returns a definition of the field access
         */
        private simpleCallExpression(ctx: any, params: CstVisitorParameters): AccessDefinition {
            const token = ctx.Identifier[0];
            return {
                identifier: token.image,
                identifierPosition: token,
                callBrackets: (ctx.callBrackets ?? []).map((brackets: CstNode) => this.visit(brackets, params))
            };
        }

        /**
         * Maps a bracket expression
         *
         * @param ctx the children of the current CST node
         * @param params parameter context which must be passed at visit
         * @returns the inner expression
         */
        private bracketExpression(ctx: any, params: CstVisitorParameters) {
            return this.visit(ctx.expression, params);
        }

        /**
         * Maps field accesses including call operators
         *
         * @param ctx the children of the current CST node
         * @param params parameter context which must be passed at visit
         * @returns the resulting expression
         */
        private fieldAccessExpression(ctx: any, params: CstVisitorParameters): Expression {
            let baseExpression = this.visit(ctx.callExpression, params);
            const startPos = baseExpression.position!;
            if (ctx.simpleCallExpression) {
                const accessDefininitions: AccessDefinition[] = ctx.simpleCallExpression.map((exp: CstNode) =>
                    this.visit(exp, params)
                );
                for (const accessDefinition of accessDefininitions) {
                    if (accessDefinition.callBrackets.length > 0) {
                        const [first, ...remaining] = accessDefinition.callBrackets;
                        const [args, endPos] = first;
                        baseExpression = new SelfInvocationExpression(
                            accessDefinition.identifier,
                            baseExpression,
                            args,
                            generateMetadata(startPos, endPos, params)
                        );
                        baseExpression = this.applyCallBrackets(baseExpression, remaining, params);
                    } else {
                        baseExpression = new FieldAccessExpression(
                            accessDefinition.identifier,
                            baseExpression,
                            generateMetadata(startPos, accessDefinition.identifierPosition, params)
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
         * @param params parameter context which must be passed at visit
         * @returns the resulting expression
         */
        private simpleFieldAccessExpression(ctx: any, params: CstVisitorParameters): Expression {
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
                        generateMetadata(expression.metadata.position!, identifier as ASTExpressionPosition, params)
                    );
                } else {
                    expression = new IdentifierExpression(
                        identifier.image,
                        metadata(optionalPosition(identifier as ASTExpressionPosition), params)
                    );
                }
            }
            return expression!;
        }

        /**
         * Maps an operator expression
         *
         * @param ctx the children of the current CST node
         * @param params parameter context which must be passed at visit
         * @returns the resulting expression
         */
        private operatorExpression(ctx: any, params: CstVisitorParameters): Expression {
            const expressions = ctx.fieldAccessExpression.map((exp: CstNode) => this.visit(exp, params));
            let expression = expressions[0];
            const startPos = expression.position;
            const operators = (ctx.simpleFieldAccessExpression ?? []).map((operator: CstNode) =>
                this.visit(operator, params)
            );
            for (let i = 0; i < operators.length; i++) {
                const rightHandSide = expressions[i + 1];
                expression = new InvocationExpression(
                    operators[i],
                    [{ value: expression }, { value: rightHandSide }],
                    generateMetadata(startPos, rightHandSide.position, params)
                );
            }
            return expression;
        }

        /**
         * Maps a destructuring expression
         *
         * @param ctx the children of the current CST node
         * @param params parameter context which must be passed at visit
         * @returns the resulting expression
         */
        private destructuringExpression(ctx: any, params: CstVisitorParameters): Expression {
            const expression = this.visit(ctx.operatorExpression, params);
            return new DestructuringExpression(
                ctx.Identifier.map((identifier: IToken) => identifier.image),
                expression,
                generateMetadata(ctx.OpenRoundBracket[0], expression.position, params)
            );
        }

        /**
         * Maps an expression
         *
         * @param ctx the children of the current CST node
         * @param params parameter context which must be passed at visit
         * @returns the resulting expression
         */
        private expression(ctx: any, params: CstVisitorParameters): Expression {
            if (ctx.destructuringExpression) {
                return this.visit(ctx.destructuringExpression, params);
            } else {
                const expressions = ctx.operatorExpression.map((exp: CstNode) => this.visit(exp, params));
                if (expressions.length > 1) {
                    const target = expressions[0];
                    const value = expressions[1];
                    const meta = generateMetadata(target.position, value.position, params);
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
