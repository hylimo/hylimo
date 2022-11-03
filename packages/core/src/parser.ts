import { CstParser } from "chevrotain";
import {
    CloseCurlyBracket,
    CloseRoundBracket,
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
    CALLABLE_EXPRESSION = "callableExpression",
    CALL_EXPRESSION = "callExpression",
    BRACKET_EXPRESSION = "bracketExpression",
    FIELD_ACCESS_EXPRESSION = "fieldAccessExpression",
    OPERATOR_EXPRESSION = "operatorExpression",
    EXPRESSION = "expression"
}

export class Parser extends CstParser {
    constructor() {
        super(Object.values(lexerDefinition), {
            nodeLocationTracking: "full"
        });
        this.performSelfAnalysis();
    }

    literal = this.RULE(Rules.LITERAL, () => {
        this.OR([
            { ALT: () => this.CONSUME(String) },
            { ALT: () => this.CONSUME(Number) }
        ]);
    });

    decorator = this.RULE(Rules.DECORATOR, () => {
        this.CONSUME(OpenSquareBracket);
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => {
                this.SUBRULE(this.decoratorEntry);
            }
        });
    });

    decoratorEntry = this.RULE(Rules.DECORATOR_ENTRY, () => {
        this.CONSUME(Identifier);
        this.OPTION(() => {
            this.CONSUME(Equal);
            this.CONSUME(String);
        });
    });

    function = this.RULE(Rules.FUNCTION, () => {
        this.OPTION(() => {
            this.SUBRULE(this.decorator);
        });
        this.CONSUME(OpenCurlyBracket);
        this.SUBRULE(this.expressions);
        this.CONSUME(CloseCurlyBracket);
    });

    expressions = this.RULE(Rules.EXPRESSIONS, () => {
        this.MANY_SEP({
            SEP: NewLine,
            DEF: () => {
                this.SUBRULE(this.expression);
            }
        });
    });

    callableExpression = this.RULE(Rules.CALLABLE_EXPRESSION, () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.literal) },
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.SUBRULE(this.callExpression) },
            { ALT: () => this.SUBRULE(this.function) },
            { ALT: () => this.SUBRULE(this.bracketExpression) },
            { ALT: () => this.SUBRULE(this.fieldAccessExpression) }
        ]);
    });

    callExpression = this.RULE(Rules.CALL_EXPRESSION, () => {
        this.SUBRULE(this.callableExpression);
        this.OPTION(() => {
            this.CONSUME(OpenRoundBracket);
            this.MANY_SEP({
                SEP: Comma,
                DEF: () => this.SUBRULE(this.expression)
            });
            this.CONSUME(CloseRoundBracket);
        });
        this.MANY(() => {
            this.SUBRULE(this.function);
        });
    });

    bracketExpression = this.RULE(Rules.BRACKET_EXPRESSION, () => {
        this.CONSUME(OpenRoundBracket);
        this.SUBRULE(this.expression);
        this.CONSUME(CloseRoundBracket);
    });

    fieldAccessExpression = this.RULE(Rules.FIELD_ACCESS_EXPRESSION, () => {
        this.SUBRULE(this.callExpression);
        this.OPTION(() => {
            this.CONSUME(Dot);
            this.CONSUME(Identifier);
        });
    });

    operatorExpression = this.RULE(Rules.OPERATOR_EXPRESSION, () => {
        this.SUBRULE1(this.fieldAccessExpression);
        this.MANY(() => {
            this.AT_LEAST_ONE_SEP({
                SEP: Dot,
                DEF: () => this.CONSUME(Identifier)
            });
            this.SUBRULE2(this.fieldAccessExpression);
        });
    });

    expression = this.RULE(Rules.EXPRESSION, () => {
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
}
