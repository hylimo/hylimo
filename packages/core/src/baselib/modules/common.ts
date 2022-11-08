import { assign, native } from "../../parser/astHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertFunction } from "../typeHelpers";
import { assertBoolean } from "./boolean";

export const commonModule: InterpreterModule = {
    name: DefaultModuleNames.COMMON,
    dependencies: [DefaultModuleNames.BOOLEAN],
    expressions: [
        assign("null", native((_, context) => context.null).call()),
        assign(
            "isNull",
            native(
                (args, context) => {
                    if (args.getField(0, context) === context.null) {
                        return context.getField("true");
                    } else {
                        return context.getField("false");
                    }
                },
                { docs: "Expects one parameter, returns true if it is null, otherwise false" }
            )
        ),
        assign(
            "if",
            native(
                (args, context) => {
                    if (assertBoolean(args.getField(0, context), "first argument of if")) {
                        const ifBranch = args.getField(1, context);
                        assertFunction(ifBranch, "second argument of if");
                        return ifBranch.invoke(context.newObject(), context);
                    } else {
                        const elseBranch = args.getField(2, context);
                        if (elseBranch === context.null) {
                            return context.null;
                        } else {
                            assertFunction(elseBranch, "third argument of if");
                            return elseBranch.invoke(context.newObject(), context);
                        }
                    }
                },
                {
                    docs: `If control flow statement. Takes two or three arguments:
                            - first must be a boolean (true or false)
                            - second argument must be a function, which is called if the first argument is true, and its value returned
                            - third argument is optional, if present must be a function which is called if the first argument is false, 
                            and its value returned. If no value was provided, null is returned`
                }
            )
        )
    ]
};
