import { assign, fun, id, jsFun } from "../../parser/astHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { functionType } from "../../types/function";
import { objectType } from "../../types/object";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertFunction, assertObject } from "../typeHelpers";
import { toBoolean } from "./booleanModule";

/**
 * Name of the temporary field where the function prototype is assigned
 */
const functionProto = "functionProto";

/**
 * Function module providing callWithScope
 */
export const functionModule = InterpreterModule.create(
    DefaultModuleNames.FUNCTION,
    [],
    [],
    [
        fun([
            assign(functionProto, fun([]).field(SemanticFieldNames.PROTO)),
            id(functionProto).assignField(
                "callWithScope",
                jsFun(
                    (args, context) => {
                        const self = args.getField(SemanticFieldNames.SELF, context);
                        const scope = args.getField(0, context);
                        assertFunction(self);
                        assertObject(scope);
                        scope.setLocalField(SemanticFieldNames.PROTO, { value: self.parentScope });
                        const res = self.invoke([], context, scope);
                        scope.setLocalField(SemanticFieldNames.ARGS, { value: context.null });
                        scope.setLocalField(SemanticFieldNames.IT, { value: context.null });
                        scope.setLocalField(SemanticFieldNames.THIS, { value: context.null });
                        return res;
                    },
                    {
                        docs: `
                            Calls a function with a provided scope.
                            Sets the prototype of the provided object.
                            This should never be set again, otherwise bugs might occur with static scoping.
                            Params:
                                - "self": the function to call
                                - 0: the scope to use
                            Returns:
                                the result of the call
                        `
                    },
                    [
                        [0, objectType()],
                        [SemanticFieldNames.SELF, functionType]
                    ]
                )
            ),
            id(functionProto).assignField(
                "==",
                jsFun(
                    (args, context) => {
                        const self = args.getField(SemanticFieldNames.SELF, context);
                        const other = args.getField(0, context);
                        return toBoolean(self === other, context);
                    },
                    {
                        docs: `
                            Compares self to another value, returns true if they are the same.
                            Params:
                                - "self": one value for the comparison
                                - 0: other value for the comparison
                            Returns:
                                true iff both values are the same
                        `
                    }
                )
            )
        ]).call()
    ]
);
