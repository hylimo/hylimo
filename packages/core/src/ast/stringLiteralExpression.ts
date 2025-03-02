import type { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import type { WrapperObject } from "../runtime/objects/wrapperObject.js";
import { Expression } from "./expression.js";
import type { ExpressionMetadata } from "./expressionMetadata.js";

/**
 * String expression
 */
export class StringLiteralExpression extends Expression {
    static readonly TYPE = "StringLiteralExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...Expression.expressionWrapperObjectEntries<StringLiteralExpression>(StringLiteralExpression.TYPE),
        ["parts", (wrapped, context) => context.newListWrapperObject(wrapped.parts, StringLiteralPart.toWrapperObject)]
    ]);

    /**
     * Creates a new StringLiteralExpression consisting out of a constant string
     *
     * @param parts the parts of the string literal
     * @param metadata metadata for the expression
     */
    constructor(
        readonly parts: StringLiteralPart[],
        metadata: ExpressionMetadata
    ) {
        super(StringLiteralExpression.TYPE, metadata);
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, StringLiteralExpression.WRAPPER_ENTRIES);
    }
}

/**
 * A part of a string literal
 * Either a content string or a template expression
 */
export type StringLiteralPart =
    | {
          content: string;
      }
    | {
          expression: Expression;
      };

namespace StringLiteralPart {
    /**
     * Converts a StringLiteralPart to a wrapper object
     *
     * @param part the part to convert
     * @param context the interpreter context
     * @returns the wrapped part
     */
    export function toWrapperObject(part: StringLiteralPart, context: InterpreterContext): WrapperObject<any> {
        if ("content" in part) {
            return context.newWrapperObject(
                part,
                new Map([["content", (wrapped, context) => context.newString(wrapped.content)]])
            );
        } else {
            return context.newWrapperObject(
                part,
                new Map([["expression", (wrapped, context) => wrapped.expression.toWrapperObject(context)]])
            );
        }
    }
}
