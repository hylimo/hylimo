import { CstParser, Lexer } from "chevrotain";
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

export enum Rules {
    LITERAL = "literal",
    DECORATOR = "decorator",
    DECORATOR_ENTRY = "decoratorEntry",
    FUNCTION = "function",
    EXPRESSIONS = "expressions",
    CALL_EXPRESSION = "callExpression",
    CALL_BRACKETS = "callBrackets",
    BRACKET_EXPRESSION = "bracketExpression",
    FIELD_ACCESS_EXPRESSION = "fieldAccessExpression",
    OPERATOR_EXPRESSION = "operatorExpression",
    EXPRESSION = "expression"
}

export class Parser extends CstParser {
    private readonly lexer = new Lexer(lexerDefinition);

    constructor() {
        super(lexerDefinition, {
            nodeLocationTracking: "full"
        });
        this.performSelfAnalysis();
    }

    private literal = this.RULE(Rules.LITERAL, () => {
        this.OR([{ ALT: () => this.CONSUME(String) }, { ALT: () => this.CONSUME(Number) }]);
    });

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

    private decoratorEntry = this.RULE(Rules.DECORATOR_ENTRY, () => {
        this.CONSUME(Identifier);
        this.OPTION(() => {
            this.CONSUME(Equal);
            this.CONSUME(String);
        });
    });

    private function = this.RULE(Rules.FUNCTION, () => {
        this.OPTION(() => {
            this.SUBRULE(this.decorator);
        });
        this.CONSUME(OpenCurlyBracket);
        this.SUBRULE(this.expressions);
        this.CONSUME(CloseCurlyBracket);
    });

    private expressions = this.RULE(Rules.EXPRESSIONS, () => {
        this.MANY(() => {
            this.OR([{ ALT: () => this.SUBRULE(this.expression) }, { ALT: () => this.CONSUME(NewLine) }]);
        });
    });

    private callBrackets = this.RULE(Rules.CALL_BRACKETS, () => {
        this.OR([
            {
                ALT: () => {
                    this.CONSUME(OpenRoundBracket);
                    this.MANY_SEP({
                        SEP: Comma,
                        DEF: () => this.SUBRULE(this.expression)
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

    private bracketExpression = this.RULE(Rules.BRACKET_EXPRESSION, () => {
        this.CONSUME(OpenRoundBracket);
        this.SUBRULE(this.expression);
        this.CONSUME(CloseRoundBracket);
    });

    private fieldAccessExpression = this.RULE(Rules.FIELD_ACCESS_EXPRESSION, () => {
        this.SUBRULE1(this.callExpression, { ARGS: [false] });
        this.MANY(() => {
            this.CONSUME(Dot);
            this.SUBRULE2(this.callExpression, { ARGS: [true] });
        });
    });

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

    private expression = this.RULE(Rules.EXPRESSION, () => {
        this.OPTION1(() => {
            this.OPTION2(() => {
                this.SUBRULE(this.callExpression);
                this.CONSUME(Dot);
            });
            this.CONSUME(Identifier);
            this.CONSUME(Equal);
        });
        this.SUBRULE(this.operatorExpression);
    });

    public parse(text: string) {
        const lexerResult = this.lexer.tokenize(text);
        this.input = lexerResult.tokens;
        const result = this.expressions();
        return result;
    }
}
