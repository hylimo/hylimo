import { ObjectExpression } from "../../ast/objectExpression";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { ExecutableListEntry } from "./executableListEntry";
import { ExecutableExpression } from "./executableExpression";

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
    constructor(expression: ObjectExpression | undefined, readonly fieldExpressions: ExecutableListEntry[]) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        const result = context.newObject();
        let indexCounter = 0;
        for (const fieldExpression of this.fieldExpressions) {
            const value = fieldExpression.value.evaluateWithSource(context);
            result.setLocalField(fieldExpression.name ?? indexCounter++, value);
        }
        return {
            value: result
        };
    }
}
