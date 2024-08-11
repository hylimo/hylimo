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
    String
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
 * Label associated with a token that is only accepted in fault tolerant mode
 */
const faultTolerantToken = "FaultTolerantToken";

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
        this.OR([
            { ALT: () => this.CONSUME(String) },
            {
                ALT: () => {
                    this.OPTION(() => this.CONSUME(SignMinus));
                    this.CONSUME(Number);
                }
            }
        ]);
    });

    /**
     * Function consisting of curly brackets with expressions inside
     */
    private function = this.RULE(Rules.FUNCTION, () => {
        this.CONSUME(OpenCurlyBracket);
        this.SUBRULE(this.expressions);
        this.CONSUME(CloseCurlyBracket);
    });

    /**
     * Rule for multiple expressions separated by newlines
     */
    private expressions = this.RULE(Rules.EXPRESSIONS, () => {
        this.MANY1(() => {
            this.CONSUME1(NewLine, { LABEL: "StartNewLine" });
        });
        this.OPTION1(() => {
            this.SUBRULE1(this.expression);
            this.MANY2(() => {
                this.AT_LEAST_ONE(() => {
                    this.CONSUME2(NewLine);
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
        this.OPTION(() => {
            this.CONSUME(Identifier);
            this.CONSUME(Equal);
        });
        this.SUBRULE(this.operatorExpression);
    });

    /**
     * Rule for object expressions allowing to create new objects
     */
    private objectExpression = this.RULE(Rules.OBJECT_EXPRESSION, () => {
        this.CONSUME(OpenSquareBracket);
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.listEntry)
        });
        this.CONSUME(CloseSquareBracket);
    });

    /**
     * Rule for function invocation brackets
     * Consists of optional round brackets with comma separated expressions inside,
     * followed by any amount of functions (which are treated like additional parameters).
     * Caution: at least one function or the round brackets block must be present to match.
     */
    private callBrackets = this.RULE(Rules.CALL_BRACKETS, () => {
        this.OR([
            {
                ALT: () => {
                    this.CONSUME(OpenRoundBracket);
                    this.MANY_SEP({
                        SEP: Comma,
                        DEF: () => this.SUBRULE(this.listEntry)
                    });
                    this.CONSUME(CloseRoundBracket);
                }
            },
            { ALT: () => this.SUBRULE1(this.function) }
        ]);
        this.MANY(() => {
            this.SUBRULE2(this.function);
        });
    });

    /**
     * Call expression, consisting of a expression in brackets, literal, function or identifier
     * followed by any amount of call brackets.
     *
     * @param onlyIdentifier if true, only an identifier is match for the first part
     */
    private callExpression = this.RULE(Rules.CALL_EXPRESSION, () => {
        this.OR1([
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.SUBRULE(this.literal) },
            { ALT: () => this.SUBRULE(this.function) },
            { ALT: () => this.SUBRULE(this.bracketExpression) },
            { ALT: () => this.SUBRULE(this.objectExpression) }
        ]);
        this.MANY(() => {
            this.SUBRULE(this.callBrackets);
        });
    });

    /**
     * Call expression, consisting of a expression in brackets, literal, function or identifier
     * followed by any amount of call brackets.
     *
     * @param onlyIdentifier if true, only an identifier is match for the first part
     */
    private simpleCallExpression = this.RULE(Rules.SIMPLE_CALL_EXPRESSION, () => {
        this.CONSUME(Identifier);
        this.MANY(() => {
            this.SUBRULE(this.callBrackets);
        });
    });

    /**
     * Bracket expression consisting of round brackets with an expression inside
     */
    private bracketExpression = this.RULE(Rules.BRACKET_EXPRESSION, () => {
        this.CONSUME(OpenRoundBracket);
        this.SUBRULE(this.expression);
        this.CONSUME(CloseRoundBracket);
    });

    /**
     * Any amount of call expressions separated by dots
     */
    private fieldAccessExpression = this.RULE(Rules.FIELD_ACCESS_EXPRESSION, () => {
        this.SUBRULE1(this.callExpression);
        this.MANY({
            DEF: () => {
                this.CONSUME(Dot);
                this.SUBRULE2(this.simpleCallExpression);
            }
        });
        if (this.faultTolerant) {
            this.OPTION(() => this.CONSUME1(Dot, { LABEL: faultTolerantToken }));
        }
    });

    /**
     * Any amount of identifiers separated by dots
     */
    private simpleFieldAccessExpression = this.RULE(Rules.SIMPLE_FIELD_ACCESS_EXPRESSION, () => {
        this.AT_LEAST_ONE_SEP({
            SEP: Dot,
            DEF: () => this.OR([{ ALT: () => this.CONSUME(Identifier) }, { ALT: () => this.CONSUME(SignMinus) }])
        });
        if (this.faultTolerant) {
            this.OPTION(() => this.CONSUME2(Dot, { LABEL: faultTolerantToken }));
        }
    });

    /**
     * Any amount of field access expressins separated by infix functions, which
     * consist of any amount of identifiers separated by dots.
     */
    private operatorExpression = this.RULE(Rules.OPERATOR_EXPRESSION, () => {
        this.SUBRULE1(this.fieldAccessExpression);
        this.MANY(() => {
            this.SUBRULE(this.simpleFieldAccessExpression);
            this.SUBRULE2(this.fieldAccessExpression);
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
        this.CONSUME(OpenRoundBracket);
        this.AT_LEAST_ONE_SEP({
            SEP: Comma,
            DEF: () => this.CONSUME(Identifier)
        });
        this.CONSUME(CloseRoundBracket);
        this.CONSUME(Equal);
        this.SUBRULE(this.operatorExpression);
    });

    /**
     * Expression, consisting of an operator expression and an assignment target
     */
    private expression = this.RULE(Rules.EXPRESSION, () => {
        this.OR([
            {
                GATE: () => this.LA(3).tokenType === Comma || this.LA(4).tokenType === Equal,
                ALT: () => this.SUBRULE(this.destructuringExpression)
            },
            {
                ALT: () => {
                    const leftSide = this.SUBRULE1(this.operatorExpression);
                    this.OPTION({
                        GATE: () =>
                            this.LA(0).tokenType == Identifier && leftSide.children.fieldAccessExpression.length == 1,
                        DEF: () => {
                            this.CONSUME(Equal);
                            this.SUBRULE2(this.operatorExpression);
                        }
                    });
                }
            }
        ]);
    });

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
                ...error,
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
