import { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression.js";
import type { OperatorExpression } from "../../ast/operatorExpression.js";
import { validate } from "../../types/validate.js";
import type { FunctionDocumentation } from "../ast/executableAbstractFunctionExpression.js";
import type { ExecutableListEntry } from "../ast/executableListEntry.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import { FullObject } from "./fullObject.js";
import type { LabeledValue } from "./labeledValue.js";
import { MissingArgumentSource } from "./labeledValue.js";

/**
 * Generates the arguments map based on argumentExpressions
 *
 * @param context context in which this is performed
 * @param args arguments to evaluate
 * @param documentation the documentation of the function, used for type checking
 * @param expression the expression that is being evaluated or undefined if not available
 * @returns the generated args
 * @throws RuntimeError when the provided arguments to not match provided types
 */

export function generateArgs(
    args: ExecutableListEntry[],
    context: InterpreterContext,
    documentation: FunctionDocumentation | undefined,
    expression: AbstractInvocationExpression | OperatorExpression | undefined
): FullObject {
    let argsObject: FullObject;
    if (expression != undefined && expression instanceof AbstractInvocationExpression) {
        argsObject = new ArgsFullObject(expression, context.objectPrototype);
    } else {
        argsObject = context.newObject();
    }
    let indexCounter = 0;
    for (const argumentExpression of args) {
        const value = argumentExpression.value.evaluateWithSource(context);
        const key = argumentExpression.name ?? indexCounter++;
        if (key === SemanticFieldNames.PROTO) {
            argsObject.setLocalField(key, value, context);
        } else {
            argsObject.setLocalFieldDirect(key, value);
        }
    }
    const params = documentation?.params;
    if (params !== undefined) {
        for (const entry of params) {
            const [key, description, type] = entry;
            if (type != undefined) {
                const argValue = argsObject.getFieldValue(key, context);
                if (type.matches(argValue, context) !== true) {
                    validate(type, `Invalid value for parameter ${key}: ${description}`, argValue, context, () => {
                        if (typeof key === "number") {
                            const indexArguments = args.filter((arg) => arg.name == undefined);
                            if (indexArguments[key]) {
                                return indexArguments[key].value.expression;
                            }
                        } else if (typeof key === "string") {
                            return [...args].reverse().find((arg) => arg.name === key)?.value?.expression;
                        }
                        return undefined;
                    });
                }
            }
        }
    }
    return argsObject;
}

/**
 * FullObject that overrides getDefaultValue to provide a MissingArgumentSources
 */
class ArgsFullObject extends FullObject {
    /**
     * Generates a new ArgsFullObject
     *
     * @param expression the invocation the arguments belong to, used as the source of missing arguments
     * @param proto the prototype of this object
     */
    constructor(
        readonly expression: AbstractInvocationExpression,
        proto: FullObject
    ) {
        super(proto);
    }

    protected override getDefaultValue(key: string | number, context: InterpreterContext): LabeledValue {
        return {
            value: context.null,
            source: new MissingArgumentSource(this.expression, key)
        };
    }
}
