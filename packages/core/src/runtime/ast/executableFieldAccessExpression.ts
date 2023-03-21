import { FieldAccessExpression } from "../../ast/fieldAccessExpression";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable FieldAccessExpression
 */
export class ExecutableFieldAccessExpression extends ExecutableExpression<FieldAccessExpression> {
    /**
     * Creates a new ExecutableIdentifierExpression consisting of a target and a field to access
     *
     * @param expression the expression this represents
     * @param target evaluated to provide the object to access
     * @param name the name of the field to access
     */
    constructor(
        expression: FieldAccessExpression | undefined,
        readonly target: ExecutableExpression<any>,
        readonly name: string | number
    ) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        const targetValue = this.target.evaluate(context).value;
        return targetValue.getFieldEntry(this.name, context);
    }
}
