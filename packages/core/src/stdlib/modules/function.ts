import { assign, fun, id, jsFun, str } from "../../parser/astHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { FullObject } from "../../runtime/objects/fullObject";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
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
                        const parentScope = args.getField(1, context);
                        assertFunction(self, "self argument of callWithScope");
                        assertObject(scope, "first positional argument of callWithScope");
                        assertObject(parentScope, "second positional argument of callWithScope");
                        const oldProto = parentScope.getLocalField(SemanticFieldNames.PROTO, context);
                        parentScope.setLocalField(SemanticFieldNames.PROTO, { value: self.parentScope }, context);
                        const res = self.invoke([], context, scope);
                        parentScope.setLocalField(SemanticFieldNames.PROTO, oldProto, context);
                        scope.setLocalField(SemanticFieldNames.ARGS, { value: context.null }, context);
                        scope.setLocalField(SemanticFieldNames.IT, { value: context.null }, context);
                        scope.setLocalField(SemanticFieldNames.THIS, { value: context.null }, context);
                        return res;
                    },
                    {
                        docs: `
                            Calls a function with a provided scope.
                            The scope's highest-level prototype (the object prototype)
                            will be replaced with the static scope of the function.
                            Params:
                                - "self": the function to call
                                - 0: the scope to use
                                - 1: the highest level scope to keep, it will temporarily get its prototype reassigned, ust be a parent scope of 0
                            Returns:
                                the result of the call
                        `
                    }
                )
            )
        ]).call()
    ]
};
