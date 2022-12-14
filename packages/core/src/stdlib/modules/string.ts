import { assign, fun, id, jsFun, str } from "../../parser/astHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { StringObject } from "../../runtime/objects/string";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { Type } from "../../types/base";
import { stringType } from "../../types/string";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertString } from "../typeHelpers";
import { toBoolean } from "./boolean";

/**
 * Name of the temporary field where the string prototype is assigned
 */
const stringProto = "stringProto";

/**
 * String module providing string functionality
 */
export const stringModule: InterpreterModule = {
    name: DefaultModuleNames.STRING,
    dependencies: [],
    runtimeDependencies: [DefaultModuleNames.BOOLEAN, DefaultModuleNames.COMMON],
    expressions: [
        fun([
            assign(stringProto, str("").field(SemanticFieldNames.PROTO)),
            id(stringProto).assignField(
                "==",
                jsFun(
                    (args, context) => {
                        const self = assertString(
                            args.getField(SemanticFieldNames.SELF, context),
                            "self argument of =="
                        );
                        const other = args.getField(0, context);
                        let res: boolean;
                        if (other instanceof StringObject) {
                            res = self === other.value;
                        } else {
                            res = false;
                        }
                        return toBoolean(res, context);
                    },
                    {
                        docs: `
                            Compares self to another value, returns true if they are the same string.
                            Params:
                                - "self": a string to compare
                                - 0: other value for the comparison
                            Returns:
                                true iff both values are the same string
                        `
                    },
                    [[SemanticFieldNames.SELF, stringType]]
                )
            ),
            id(stringProto).assignField(
                "+",
                jsFun(
                    (args, context) => {
                        const self = assertString(args.getField(SemanticFieldNames.SELF, context));
                        const other = assertString(args.getField(0, context));
                        return context.newString(self + other);
                    },
                    {
                        docs: `
                            Concatenates two strings.
                            Params:
                                - "self": the string to concatenate to
                                - 0: the concatenated value, must be a string
                            Returns:
                                concatenation of the two strings
                        `
                    },
                    [
                        [0, stringType],
                        [SemanticFieldNames.SELF, stringType]
                    ]
                )
            )
        ]).call()
    ]
};
