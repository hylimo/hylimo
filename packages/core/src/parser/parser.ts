import { CstNode, CstParser, ILexingError, IRecognitionException, Lexer } from "chevrotain";
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
    String
} from "./lexer";

/**
 * All existing grammar rules
 */
export enum Rules {
    LITERAL = "literal",
    DECORATOR = "decorator",
    DECORATOR_ENTRY = "decoratorEntry",
    FUNCTION = "function",
    EXPRESSIONS = "expressions",
    CALL_EXPRESSION = "callExpression",
    CALL_BRACKETS = "callBrackets",
    CALL_ARGUMENT = "callArgument",
    BRACKET_EXPRESSION = "bracketExpression",
    FIELD_ACCESS_EXPRESSION = "fieldAccessExpression",
    OPERATOR_EXPRESSION = "operatorExpression",
    EXPRESSION = "expression"
}

/**
 * Cst result of the parser
 */
interface CstResult {
    /**
     * Errors during lexing
     */
    lexingErrors: ILexingError[];
    /**
     * Errors during parsing
     */
    parserErrors: IRecognitionException[];
    /**
     * Resulting CST
     */
    cst?: CstNode;
}

/**
 * Parser used to generate a CST or AST
 */
export class Parser extends CstParser {
    /**
     * Lexer used to split text into tokens
     */
    private readonly lexer = new Lexer(lexerDefinition);

    constructor() {
        super(lexerDefinition, {
            nodeLocationTracking: "full"
        });
        this.performSelfAnalysis();
    }

    /**
     * Literal rule, matches String and Number Tokens
     */
    private literal = this.RULE(Rules.LITERAL, () => {
        this.OR([{ ALT: () => this.CONSUME(String) }, { ALT: () => this.CONSUME(Number) }]);
    });

    /**
     * Decorator which can be applied to functions
     * Consists of square brackets with decorator entries inside
     */
    private decorator = this.RULE(Rules.DECORATOR, () => {
        this.CONSUME(OpenSquareBracket);
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => {
                this.SUBRULE(this.decoratorEntry);
            }
        });
        this.CONSUME(CloseSquareBracket);
    });

    /**
     * Decorator entry rule, either an identifier or an identifier
     * followed by a string assignment
     */
    private decoratorEntry = this.RULE(Rules.DECORATOR_ENTRY, () => {
        this.CONSUME(Identifier);
        this.OPTION(() => {
            this.CONSUME(Equal);
            this.CONSUME(String);
        });
    });

    /**
     * Function consisting of curly brackets with expressions inside
     */
    private function = this.RULE(Rules.FUNCTION, () => {
        this.OPTION(() => {
            this.SUBRULE(this.decorator);
        });
        this.CONSUME(OpenCurlyBracket);
        this.SUBRULE(this.expressions);
        this.CONSUME(CloseCurlyBracket);
    });

    /**
     * Rule for multiple expressions separated by newlines
     */
    private expressions = this.RULE(Rules.EXPRESSIONS, () => {
        this.MANY1(() => {
            this.CONSUME1(NewLine)
        })
        this.OPTION1(() => {
            this.SUBRULE1(this.expression)
            this.MANY2(() => {
                this.AT_LEAST_ONE(() => {
                    this.CONSUME2(NewLine)
                })
                this.OPTION2(() => this.SUBRULE2(this.expression))
            })
        })
    });

    /**
     * Argument of a function invocation
     * An (optionally named) operator expression (no assignment)
     */
    private callArgument = this.RULE(Rules.CALL_ARGUMENT, () => {
        this.OPTION(() => {
            this.CONSUME(Identifier);
            this.CONSUME(Equal);
        });
        this.SUBRULE(this.operatorExpression);
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
                        DEF: () => this.SUBRULE(this.callArgument)
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
    private callExpression = this.RULE(Rules.CALL_EXPRESSION, ((onlyIdentifier: boolean) => {
        this.OR1([
            { ALT: () => this.CONSUME(Identifier) },
            {
                GATE: () => !onlyIdentifier,
                ALT: () =>
                    this.OR2([
                        { ALT: () => this.SUBRULE(this.literal) },
                        { ALT: () => this.SUBRULE(this.function) },
                        { ALT: () => this.SUBRULE(this.bracketExpression) }
                    ])
            }
        ]);
        this.MANY(() => {
            this.SUBRULE(this.callBrackets);
        });
    }) as any);

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
        this.SUBRULE1(this.callExpression, { ARGS: [false] });
        this.MANY({
            DEF: () => {
                this.CONSUME(Dot);
                this.SUBRULE2(this.callExpression, { ARGS: [true] });
            }
        });
    });

    /**
     * Any amount of field access expressins separated by infix functions, which
     * consist of any amount of identifiers separated by dots.
     */
    private operatorExpression = this.RULE(Rules.OPERATOR_EXPRESSION, () => {
        this.SUBRULE1(this.fieldAccessExpression);
        this.MANY(() => {
            this.AT_LEAST_ONE_SEP({
                SEP: Dot,
                DEF: () => this.CONSUME(Identifier)
            });
            this.SUBRULE2(this.fieldAccessExpression);
        });
    });

    /**
     * Expression, consisting of an operator expression and an assignment target
     */
    private expression = this.RULE(Rules.EXPRESSION, () => {
        const leftSide = this.SUBRULE1(this.operatorExpression);
        this.OPTION({
            GATE: () => this.LA(0).tokenType == Identifier && leftSide.children.fieldAccessExpression.length == 1,
            DEF: () => {
                this.CONSUME2(Equal);
                this.SUBRULE3(this.operatorExpression);
            }
        });
    });

    /**
     * Parses a text to a CST
     * @param text the text to parse
     * @returns the generated CST and possible errors
     */
    public parse(text: string): CstResult {
        const lexerResult = this.lexer.tokenize(text);
        if (lexerResult.errors.length > 0) {
            return {
                lexingErrors: lexerResult.errors,
                parserErrors: []
            };
        }
        this.input = lexerResult.tokens;
        const result = this.expressions();
        return {
            lexingErrors: [],
            parserErrors: this.errors,
            cst: result
        };
    }
}
