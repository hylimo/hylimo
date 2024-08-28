import { ExecutableNativeExpression } from "../../runtime/ast/executableNativeExpression.js";
import { assign, fun, id, jsFun } from "../../runtime/executableAstHelper.js";
import { InterpreterModule } from "../../runtime/interpreter/interpreterModule.js";
import { WrapperObject } from "../../runtime/objects/wrapperObject.js";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames.js";
import { DefaultModuleNames } from "../defaultModuleNames.js";
import { assertWrapperObject } from "../typeHelpers.js";

/**
 * Name of the wrapper object proto object
 */
const wrapperProto = "wrapperProto";

/**
 * Wrapper (object) module
 * Adds support for wrapper objects
 */
export const wrapperModule = InterpreterModule.create(
    DefaultModuleNames.WRAPPER,
    [],
    [DefaultModuleNames.COMMON],
    [
        fun([
            assign(wrapperProto, new ExecutableNativeExpression((context) => ({ value: context.wrapperPrototype }))),
            id(wrapperProto).assignField(
                "==",
                jsFun(
                    (args, context) => {
                        const self = args.getFieldValue(SemanticFieldNames.SELF, context);
                        assertWrapperObject(self, "self");
                        const other = args.getFieldValue(0, context);
                        let res: boolean;
                        if (other instanceof WrapperObject) {
                            res = self.wrapped === other.wrapped;
                        } else {
                            res = false;
                        }
                        return context.newBoolean(res);
                    },
                    {
                        docs: "Compares self to another value, returns true if they are the same.",
                        params: [
                            [SemanticFieldNames.SELF, "first value for the comparison"],
                            [0, "other value for the comparison"]
                        ],
                        returns: "true iff both values are the same"
                    }
                )
            )
        ]).call()
    ]
);
