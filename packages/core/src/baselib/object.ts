import { DefaultModuleNames } from "./defaultModuleNames";
import { InterpreterModule } from "../runtime/interpreter";
import { assign, fun, id, native } from "../parser/astHelper";
import { SemanticFieldNames } from "../runtime/semanticFieldNames";

/**
 * Name of the temporary field where the object prototype is assigned
 */
const objectProto = "objectProto";

/**
 * The object module
 */
export const objectModule: InterpreterModule = {
    name: DefaultModuleNames.OBJECT,
    dependencies: [],
    expressions: [
        fun([
            assign(objectProto, id(SemanticFieldNames.ARGS).field(SemanticFieldNames.PROTO)),
            id(objectProto).assignField(
                "toString",
                native(
                    (args, context) => {
                        const self = args.getField(SemanticFieldNames.SELF, context).value;
                        return context.newString(self.toString());
                    },
                    { docs: "Returns a string representation" }
                )
            )
        ]).call()
    ]
};
