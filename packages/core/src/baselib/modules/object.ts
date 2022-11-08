import { DefaultModuleNames } from "../defaultModuleNames";
import { InterpreterModule } from "../../runtime/interpreter";
import { assign, fun, id, native, str } from "../../parser/astHelper";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";

/**
 * Name of the temporary field where the object prototype is assigned
 */
const objectProto = "objectProto";

/**
 * The object module
 */
export const objectModule: InterpreterModule = {
    name: DefaultModuleNames.OBJECT,
    dependencies: [DefaultModuleNames.COMMON, DefaultModuleNames.BOOLEAN],
    expressions: [
        fun([
            assign(objectProto, id(SemanticFieldNames.ARGS).field(SemanticFieldNames.PROTO)),
            id(objectProto).assignField(
                "toString",
                native(
                    (args, context) => {
                        const self = args.getFieldEntry(SemanticFieldNames.SELF, context).value;
                        return context.newString(self.toString());
                    },
                    { docs: "Returns a string representation" }
                )
            )
        ]).call(),
        assign(
            "toStr",
            fun(
                [
                    id(SemanticFieldNames.THIS).assignField("_value", id(SemanticFieldNames.ARGS).field(0)),
                    id("if").call(
                        id("isNull").call(id("_value")),
                        fun([str("null")]),
                        fun([id("_value").callField("toString")])
                    )
                ],
                {
                    docs: "Transforms its first parameter to a string"
                }
            )
        )
    ]
};
