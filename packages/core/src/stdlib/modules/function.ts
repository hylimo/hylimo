import { assign, fun, id, jsFun, str } from "../../parser/astHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { FullObject } from "../../runtime/objects/fullObject";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { Type } from "../../types/base";
import { functionType } from "../../types/function";
import { objectType } from "../../types/object";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertFunction, assertObject } from "../typeHelpers";

/**
 * Name of the temporary field where the function prototype is assigned
 */
const functionProto = "functionProto";

/**
 * Function module providing callWithScope
 */
export const functionModule: InterpreterModule = {
    name: DefaultModuleNames.FUNCTION,
    dependencies: [],
    runtimeDependencies: [],
    expressions: [
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
                        scope.setLocalField(SemanticFieldNames.PROTO, { value: self.parentScope }, context);
                        const res = self.invoke([], context, scope);
                        scope.setLocalField(SemanticFieldNames.ARGS, { value: context.null }, context);
                        scope.setLocalField(SemanticFieldNames.IT, { value: context.null }, context);
                        scope.setLocalField(SemanticFieldNames.THIS, { value: context.null }, context);
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
                    new Map<string | number, Type>([
                        [0, objectType()],
                        [SemanticFieldNames.SELF, functionType]
                    ])
                )
            )
        ]).call()
    ]
};
