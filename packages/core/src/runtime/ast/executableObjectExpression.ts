import type { ObjectExpression } from "../../ast/objectExpression.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { LabeledValue } from "../objects/labeledValue.js";
import type { ExecutableListEntry } from "./executableListEntry.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable ObjectExpression
 */
export class ExecutableObjectExpression extends ExecutableExpression<ObjectExpression> {
    /**
     * Creates a new ExecutableObjectExpression consisting of a set of fields
     *
     * @param expression the expression this represents
     * @param fieldExpressions evaluated to provide the fields
     */
    constructor(
        expression: ObjectExpression | undefined,
        readonly fieldExpressions: ExecutableListEntry[]
    ) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        const result = context.newObject();
        let indexCounter = 0;
        for (const fieldExpression of this.fieldExpressions) {
            const value = fieldExpression.value.evaluateWithSource(context);
            result.setLocalField(fieldExpression.name ?? indexCounter++, value, context);
        }
        return {
            value: result
        };
    }
}
