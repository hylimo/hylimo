import { CstNode, CstParser, ICstVisitor, ILexingError, IRecognitionException, IToken, Lexer } from "chevrotain";
import { Expression } from "../ast/expression.js";
import { ASTExpressionPosition } from "../ast/astExpressionPosition.js";
import { generateCstToAstTransfromer } from "./cstToAstTransformer.js";
import {
    CloseCurlyBracket,
    CloseRoundBracket,
    CloseSquareBracket,
    Comma,
    Dot,
    Equal,
    Identifier,
    lexerDefinition,
    NewLine,
    Number,
    OpenCurlyBracket,
    OpenRoundBracket,
    OpenSquareBracket,
    SignMinus,
    String,
    TokenType
} from "./lexer.js";

/**
 * All existing grammar rules
 */
export enum Rules {
    LITERAL = "literal",
    FUNCTION = "function",
    EXPRESSIONS = "expressions",
    CALL_EXPRESSION = "callExpression",
    SIMPLE_CALL_EXPRESSION = "simpleCallExpression",
    CALL_BRACKETS = "callBrackets",
    LIST_ENTRY = "listEntry",
    BRACKET_EXPRESSION = "bracketExpression",
    FIELD_ACCESS_EXPRESSION = "fieldAccessExpression",
    SIMPLE_FIELD_ACCESS_EXPRESSION = "simpleFieldAccessExpression",
    OPERATOR_EXPRESSION = "operatorExpression",
    OBJECT_EXPRESSION = "objectExpression",
    EXPRESSION = "expression",
    DESTRUCTURING_EXPRESSION = "destructuringExpression"
}

/**
 * Cst result of the parser
 */
export interface CstResult {
    /**
     * Errors during lexing
     */
    lexingErrors: ILexingError[];
    /**
     * Errors during parsing
     */
    parserErrors: (IRecognitionException & { position: ASTExpressionPosition })[];
    /**
     * Resulting CST
     */
    cst?: CstNode;
    /**
     * The executable
     */
    ast?: Expression[];
    /**
     * Comments in the cst
     */
    comments: IToken[];
}

/**
 * Additional token types
 */
enum AdditionalToken {
    START_NEW_LINE = "StartNewLine",
    FAULT_TOLERANT = "FaultTolerantToken"
}

/**
 * Dictionary of all possible children of a CST node
 */
export type CstChildrenDictionary = Record<TokenType | AdditionalToken, IToken[]> & Record<Rules, CstNode[]>;

/**
 * Parser used to generate a CST or AST
 */
export class Parser extends CstParser {
    /**
     * Lexer used to split text into tokens
     */
    private readonly lexer = new Lexer(lexerDefinition);

    /**
     * Visitor to be used to generate the AST
     */
    private readonly visitor: ICstVisitor<never, any>;

    /**
     * The tex to parse
     */
    private text: string = "";

    /**
     * Creates a new parser
     *
     * @param faultTolerant whether the parser accepts slightly invalid inputs
     */
    constructor(readonly faultTolerant: boolean = false) {
        super(lexerDefinition, {
            nodeLocationTracking: "full"
        });
        this.performSelfAnalysis();
        this.visitor = generateCstToAstTransfromer(this);
    }

    /**
     * Literal rule, matches String and Number Tokens
     */
    private literal = this.RULE(Rules.LITERAL, () => {
        this.OR({
            DEF: [
                { ALT: () => this.CONSUME(String) },
                {
                    ALT: () => {
                        this.OPTION(() => this.CONSUME(SignMinus));
                        this.CONSUME(Number);
                    }
                }
            ],
            ERR_MSG: "Expected a literal but found none"
        });
    });

    /**
     * Function consisting of curly brackets with expressions inside
     */
    private function = this.RULE(Rules.FUNCTION, () => {
        this.CONSUME(OpenCurlyBracket, { ERR_MSG: "Function body is missing its opening '{'" });
        this.withError(() => this.SUBRULE(this.expressions), "Could not parse function body");
        this.CONSUME(CloseCurlyBracket, { ERR_MSG: "Function body is missing its closing '}'" });
    });

    /**
     * Rule for multiple expressions separated by newlines
     */
    private expressions = this.RULE(Rules.EXPRESSIONS, () => {
        this.MANY1(() => {
            this.CONSUME1(NewLine, { LABEL: AdditionalToken.START_NEW_LINE });
        });
        this.OPTION1(() => {
            this.withError(() => this.SUBRULE1(this.expression), "At least one expression is required");
            this.MANY2(() => {
                this.AT_LEAST_ONE({
                    DEF: () => {
                        this.CONSUME2(NewLine);
                    },
                    ERR_MSG: "Each expression must be located on its own line"
                });
                this.OPTION2(() => this.SUBRULE2(this.expression));
            });
        });
    });

    /**
     * List entry, used for function parameters and object expressions
     * An (optionally named) operator expression (no assignment)
     */
    private listEntry = this.RULE(Rules.LIST_ENTRY, () => {
        let name: any /*Should be IToken | null, but TS complains for some reason */ = null;
        this.OPTION(() => {
            name = this.CONSUME(Identifier, { ERR_MSG: "Named parameter is missing its name" });
            this.CONSUME(Equal, { ERR_MSG: "Named parameter is missing its '='" });
        });
        this.withError(
            () => this.SUBRULE(this.operatorExpression),
            name ? `Named parameter '${name.image}' is missing its value` : "Unnamed parameter is missing its value"
        );
    });

    /**
     * Rule for object expressions allowing to create new objects
     */
    private objectExpression = this.RULE(Rules.OBJECT_EXPRESSION, () => {
        this.CONSUME(OpenSquareBracket, { ERR_MSG: "Object expressions are started using '['" });
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.listEntry)
        });

        // Allow trailing commas
        this.OPTION(() => {
            this.CONSUME(Comma);
        });
        this.CONSUME(CloseSquareBracket, { ERR_MSG: "Object expressions are terminated using ']'" });
    });

    /**
     * Rule for function invocation brackets
     * Consists of optional round brackets with comma separated expressions inside,
     * followed by any amount of functions (which are treated like additional parameters).
     * Caution: at least one function or the round brackets block must be present to match.
     */
    private callBrackets = this.RULE(Rules.CALL_BRACKETS, () => {
        this.OR({
            DEF: [
                {
                    ALT: () => {
                        this.CONSUME(OpenRoundBracket, { ERR_MSG: "Opening '(' of function call is missing" });
                        this.MANY_SEP({
                            SEP: Comma,
                            DEF: () =>
                                this.withError(() => this.SUBRULE(this.listEntry), "Expected a function parameter", this.OR1)
                        });
                        this.CONSUME(CloseRoundBracket, { ERR_MSG: "Closing ')' of function call is missing" });
                    }
                },
                { ALT: () => this.SUBRULE1(this.function) }
            ],
            ERR_MSG: "Function call is missing"
        });
        this.MANY(() => {
            this.SUBRULE2(this.function);
        });
    });

    /**
     * Call expression, consisting of an expression in brackets, literal, function or identifier
     * followed by any amount of call brackets.
     *
     * @param onlyIdentifier if true, only an identifier is match for the first part
     */
    private callExpression = this.RULE(Rules.CALL_EXPRESSION, () => {
        this.OR1({
            DEF: [
                { ALT: () => this.CONSUME(Identifier) },
                { ALT: () => this.SUBRULE(this.literal) },
                { ALT: () => this.SUBRULE(this.function) },
                { ALT: () => this.SUBRULE(this.bracketExpression) },
                { ALT: () => this.SUBRULE(this.objectExpression) }
            ],
            ERR_MSG: "Did not find an expression"
        });
        this.MANY(() => {
            this.SUBRULE(this.callBrackets);
        });
    });

    /**
     * Call expression, consisting of an expression in brackets, literal, function or identifier
     * followed by any amount of call brackets.
     *
     * @param onlyIdentifier if true, only an identifier is match for the first part
     */
    private simpleCallExpression = this.RULE(Rules.SIMPLE_CALL_EXPRESSION, () => {
        this.CONSUME(Identifier, { ERR_MSG: "Function call is missing its caller" });
        this.MANY(() => {
            this.SUBRULE(this.callBrackets);
        });
    });

    /**
     * Bracket expression consisting of round brackets with an expression inside
     */
    private bracketExpression = this.RULE(Rules.BRACKET_EXPRESSION, () => {
        this.CONSUME(OpenRoundBracket, { ERR_MSG: "Parenthesized expression is missing its '('" });
        const expression = this.withError(
            () => this.SUBRULE(this.expression),
            "Parenthesized expression is missing its inner expression"
        );
        this.CONSUME(CloseRoundBracket, {
            ERR_MSG: `Parenthesized expression '(${this.getText(expression)})' is missing its ')'`
        });
    });

    /**
     * Any amount of call expressions separated by dots
     */
    private fieldAccessExpression = this.RULE(Rules.FIELD_ACCESS_EXPRESSION, () => {
        this.SUBRULE1(this.callExpression);
        this.MANY({
            DEF: () => {
                this.CONSUME(Dot, { ERR_MSG: "Expected a '.' but found none" });
                this.withError(() => this.SUBRULE2(this.simpleCallExpression), `Identifiers may not end with a '.'`);
            }
        });
        if (this.faultTolerant) {
            this.OPTION(() => this.CONSUME1(Dot, { LABEL: AdditionalToken.FAULT_TOLERANT }));
        }
    });

    /**
     * Any amount of identifiers separated by dots
     */
    private simpleFieldAccessExpression = this.RULE(Rules.SIMPLE_FIELD_ACCESS_EXPRESSION, () => {
        this.AT_LEAST_ONE_SEP({
            SEP: Dot,
            DEF: () =>
                this.withError2(
                    () => this.CONSUME(Identifier),
                    () => this.CONSUME(SignMinus),
                    `Expected an identifier or '-', but found neither`
                ),
            ERR_MSG: "Identifier or '-' is missing"
        });
        if (this.faultTolerant) {
            this.OPTION(() => this.CONSUME2(Dot, { LABEL: AdditionalToken.FAULT_TOLERANT }));
        }
    });

    /**
     * Any amount of field access expressions separated by infix functions, which
     * consist of any amount of identifiers separated by dots.
     */
    private operatorExpression = this.RULE(Rules.OPERATOR_EXPRESSION, () => {
        const first = this.SUBRULE1(this.fieldAccessExpression);
        let i = 0;
        this.MANY(() => {
            i++;
            const operator = this.SUBRULE(this.simpleFieldAccessExpression);
            this.withError(
                () => this.SUBRULE2(this.fieldAccessExpression),
                `infix expression started with operand '${this.getText(first)}' and${i > 1 ? " trailing" : ""} operator '${this.getText(operator)}' is missing its terminal expression`
            );
        });
        if (this.faultTolerant) {
            this.OPTION(() => this.SUBRULE3(this.simpleFieldAccessExpression));
        }
    });

    /**
     * Destructuring expression, consisting of a left side of one or more identifiers in brackets,
     * an Equal sign and an operatorExpression on the right side.
     */
    private destructuringExpression = this.RULE(Rules.DESTRUCTURING_EXPRESSION, () => {
        const opening = this.CONSUME(OpenRoundBracket);
        const elements: string[] = [];
        this.AT_LEAST_ONE_SEP({
            SEP: Comma,
            DEF: () => elements.push(this.CONSUME(Identifier).image),
            ERR_MSG: "Destructuring expressions need at least one element inside them"
        });
        this.OPTION(() => this.CONSUME(Comma)); // Allow trailing commas
        const closing = this.CONSUME(CloseRoundBracket, {
            ERR_MSG: `Destructuring expression '${opening.image}${this.elementsToText(elements)}' is missing its ending ')'`
        });
        const equals = this.CONSUME(Equal, {
            ERR_MSG: `Behind destructuring expression '${opening.image}${this.elementsToText(elements)}${closing.image}', a '=' is expected`
        });
        this.withError(
            () => this.SUBRULE(this.operatorExpression),
            `Assignment expression '${opening.image}${this.elementsToText(elements)}${closing.image}${equals.image}' is missing the value(s) you want to store`
        );
    });

    /**
     * Expression, consisting of an operator expression and an assignment target
     */
    private expression = this.RULE(Rules.EXPRESSION, () => {
        this.OR({
            DEF: [
                {
                    GATE: () => this.LA(3).tokenType === Comma || this.LA(4).tokenType === Equal,
                    ALT: () => this.SUBRULE(this.destructuringExpression)
                },
                {
                    ALT: () => {
                        const leftSide = this.SUBRULE1(this.operatorExpression);
                        this.OPTION({
                            GATE: () =>
                                this.LA(0).tokenType == Identifier &&
                                leftSide.children.fieldAccessExpression.length == 1,
                            DEF: () => {
                                const equals = this.CONSUME(Equal);
                                this.withError(
                                    () => this.SUBRULE2(this.operatorExpression),
                                    `Assignment expression '${this.getText(leftSide)}${equals.image}' is missing the value you want to store`,
                                    this.OR1
                                );
                            }
                        });
                    }
                }
            ],
            ERR_MSG: "Expected to find an expression but found none"
        });
    });

    private getText(cstNode: CstNode | undefined): string {
        if (cstNode == undefined || cstNode.location == undefined) {
            return "";
        }
        return this.text.substring(cstNode.location.startOffset, cstNode.location.endOffset! + 1);
    }

    private elementsToText(elements: string[]): string {
        return elements.join(",");
    }

    private withError<Type>(rule: () => Type, errorMessage: string, or?: typeof this.OR): Type {
        return (or ?? this.OR).call(this, {
            DEF: [{ ALT: rule }],
            ERR_MSG: errorMessage
        });
    }

    private withError2<Type>(rule1: () => Type, rule2: () => Type, errorMessage: string): Type {
        return this.OR({
            DEF: [{ ALT: rule1 }, { ALT: rule2 }],
            ERR_MSG: errorMessage
        });
    }

    /**
     * Generates the AST based on a CST
     *
     * @param cst the top level cst node (should always be of type Expressions)
     * @returns the generated AST
     */
    private generateAST(cst: CstNode): Expression[] {
        return this.visitor.visit(cst) as Expression[];
    }

    /**
     * Parses a text to a CST
     * @param text the text to parse
     * @returns the generated CST and possible errors
     */
    public parse(text: string): CstResult {
        const lexerResult = this.lexer.tokenize(text);
        this.input = lexerResult.tokens;
        this.text = text;
        const result = this.expressions();
        let ast = undefined;
        if (result != undefined) {
            ast = this.generateAST(result);
        }
        for (const error of lexerResult.errors) {
            error.line! -= 1;
            error.column! -= 1;
        }
        return {
            comments: lexerResult.groups.comment,
            lexingErrors: lexerResult.errors,
            parserErrors: this.errors.map((error) => ({
                name: error.name,
                message: error.message,
                token: error.token,
                resyncedTokens: error.resyncedTokens,
                context: error.context,
                position: {
                    startOffset: error.token.startOffset,
                    endOffset: error.token.endOffset! + 1,
                    startLine: error.token.startLine! - 1,
                    endLine: error.token.endLine! - 1,
                    startColumn: error.token.startColumn! - 1,
                    endColumn: error.token.endColumn!
                }
            })),
            cst: result,
            ast: ast
        };
    }
}
