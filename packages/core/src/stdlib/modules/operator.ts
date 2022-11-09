import { ConstExpression } from "../../parser/ast";
import { assign, native } from "../../parser/astHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { RuntimeError } from "../../runtime/runtimeError";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { DefaultModuleNames } from "../defaultModuleNames";

/**
 * Operator module
 * Adds operators which delegate the call to the first argument
 * Provides +, -, *, /, &&, ||
 */
export const operatorModule: InterpreterModule = {
    name: DefaultModuleNames.OPERATOR,
    dependencies: [],
    runtimeDependencies: [],
    expressions: ["+", "-", "*", "/", "%", "&&", "||", "==", "!=", ">", ">=", "<", "<="].map((operator) =>
        assign(
            operator,
            native(
                (args, context) => {
                    if (args.length != 2 || args[0].name !== undefined || args[1].name !== undefined) {
                        throw new RuntimeError(`Expected exactly two positional arguments for ${operator}`);
                    }
                    const target = args[0].value.evaluateWithSource(context);
                    return target.value
                        .getField(operator, context)
                        .invoke(
                            [args[1], { name: SemanticFieldNames.SELF, value: new ConstExpression(target) }],
                            context
                        );
                },
                {
                    docs: `
                        The ${operator} operator, expects two arguments, calls ${operator} on the first 
                        argument with the second argument.
                        Params:
                            - 0: the target where ${operator} is invoked
                            - 1: the value passed to the ${operator} function
                        Returns:
                            The result of the invokation of ${operator} on the first argument
                    `
                }
            )
        )
    )
};
