import { ExecutableNativeExpression } from "../../runtime/ast/executableNativeExpression.js";
import { assign, fun, id, jsFun } from "../../runtime/executableAstHelper.js";
import { InterpreterModule } from "../../runtime/interpreter.js";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames.js";
import { functionType } from "../../types/function.js";
import { objectType } from "../../types/object.js";
import { DefaultModuleNames } from "../defaultModuleNames.js";
import { assertFunction, assertObject } from "../typeHelpers.js";

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
    [DefaultModuleNames.COMMON],
    [
        fun([
            assign(functionProto, new ExecutableNativeExpression((context) => ({ value: context.functionPrototype }))),
            id(functionProto).assignField(
                "callWithScope",
                jsFun(
                    (args, context) => {
                        const self = args.getField(SemanticFieldNames.SELF, context);
                        const scope = args.getField(0, context);
                        assertFunction(self);
                        assertObject(scope);
                        scope.setLocalField(SemanticFieldNames.PROTO, { value: self.parentScope }, context);
                        const res = self.invoke([], context, scope);
                        scope.setLocalField(SemanticFieldNames.ARGS, { value: context.null }, context);
                        scope.setLocalField(SemanticFieldNames.IT, { value: context.null }, context);
                        scope.setLocalField(SemanticFieldNames.THIS, { value: context.null }, context);
                        return res;
                    },
                    {
                        docs: "Calls a function with a provided scope. Sets the prototype of the provided object. This should never be set again, otherwise bugs might occur with static scoping.",
                        params: [
                            [SemanticFieldNames.SELF, "the function to call", functionType],
                            [0, "the scope to use", objectType()]
                        ],
                        returns: "the result of the call"
                    }
                )
            ),
            id(functionProto).assignField(
                "==",
                jsFun(
                    (args, context) => {
                        const self = args.getField(SemanticFieldNames.SELF, context);
                        const other = args.getField(0, context);
                        return context.newBoolean(self === other);
                    },
                    {
                        docs: "Compares self to another value, returns true if they are the same.",
                        params: [
                            [SemanticFieldNames.SELF, "one value for the comparison"],
                            [0, "other value for the comparison"]
                        ],
                        returns: "true iff both values are the same"
                    }
                )
            )
        ]).call()
    ]
);
