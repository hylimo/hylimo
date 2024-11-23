import { StringLiteralExpression } from "../../ast/stringLiteralExpression.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { BaseObject } from "../objects/baseObject.js";
import { AbstractFunctionObject } from "../objects/functionObject.js";
import { LabeledValue } from "../objects/labeledValue.js";
import { StringObject } from "../objects/stringObject.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import { ExecutableConstExpression } from "./executableConstExpression.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable StringLiteralExpression
 */
export class ExecutableStringLiteralExpression extends ExecutableExpression<StringLiteralExpression> {
    /**
     * Creates a new ExecutableStringLiteralExpression
     *
     * @param expression the expression this represents
     * @param parts the parts of the string literal
     */
    constructor(
        expression: StringLiteralExpression | undefined,
        readonly parts: ExecutableStringLiteralPart[]
    ) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        let value: string = "";
        for (const part of this.parts) {
            if ("content" in part) {
                value += part.content;
            } else {
                const evaluationResult = part.expression.evaluate(context);
                let evaluationResultValue = evaluationResult.value;
                let toString: BaseObject | undefined;
                if (!evaluationResultValue.isNull) {
                    toString = evaluationResultValue.getFieldValue("toString", context);
                }

                if (toString instanceof AbstractFunctionObject) {
                    evaluationResultValue = toString.invoke(
                        [{ name: SemanticFieldNames.SELF, value: new ExecutableConstExpression(evaluationResult) }],
                        context,
                        undefined,
                        undefined
                    ).value;
                }
                value += evaluationResultValue.toString(context);
            }
        }
        return { value: new StringObject(value, context.stringPrototype) };
    }
}

/**
 * A part of a string literal
 * Either a content string or a template expression
 */
export type ExecutableStringLiteralPart =
    | {
          content: string;
      }
    | {
          expression: ExecutableExpression;
      };
