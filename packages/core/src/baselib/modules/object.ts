import { DefaultModuleNames } from "../defaultModuleNames";
import { InterpreterModule } from "../../runtime/interpreter";
import { assign, fun, id, jsFun, str } from "../../parser/astHelper";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { assertObject } from "../typeHelpers";
import { BaseObject } from "../../runtime/objects/baseObject";
import { StringObject } from "../../runtime/objects/string";
import { NumberObject } from "../../runtime/objects/number";
import { RuntimeError } from "../../runtime/runtimeError";

/**
 * Name of the temporary field where the object prototype is assigned
 */
const objectProto = "objectProto";

/**
 * Asserts that the value is a string or a number, and returns its value
 *
 * @param value the value to check
 * @returns the string or number value
 */
function assertIndex(value: BaseObject): string | number {
    if (value instanceof StringObject) {
        return value.value;
    } else if (value instanceof NumberObject) {
        return value.value;
    } else {
        throw new RuntimeError("Only string and number are supported as index types");
    }
}

/**
 * Object module
 * Adds toStr function and functions on object
 */
export const objectModule: InterpreterModule = {
    name: DefaultModuleNames.OBJECT,
    dependencies: [DefaultModuleNames.COMMON, DefaultModuleNames.BOOLEAN],
    expressions: [
        fun([
            assign(objectProto, id(SemanticFieldNames.ARGS).field(SemanticFieldNames.PROTO)),
            id(objectProto).assignField(
                "toString",
                jsFun(
                    (args, context) => {
                        const self = args.getFieldEntry(SemanticFieldNames.SELF, context).value;
                        return context.newString(self.toString());
                    },
                    {
                        docs: `
                            Creates and returns a string representation.
                            Params:
                                - "self": the input which is transformed to a string
                            Returns:
                                The string representation
                        `
                    }
                )
            ),
            id(objectProto).assignField(
                "get",
                jsFun(
                    (args, context) => {
                        const self = args.getField(SemanticFieldNames.SELF, context);
                        return self.getField(assertIndex(args.getField(0, context)), context);
                    },
                    {
                        docs: `
                            Gets the value of the field at the defined index.
                            Takes the proto chain into account.
                            Params:
                                - 0: the index to access, must be a valid index (string or integer >= 0)
                                - "self": where to access the field
                            Returns:
                                The found value
                        `
                    }
                )
            ),
            id(objectProto).assignField(
                "rawGet",
                jsFun(
                    (args, context) => {
                        const self = args.getField(SemanticFieldNames.SELF, context);
                        assertObject(self, "self argument of rawGet");
                        return self.getLocalField(assertIndex(args.getField(0, context)), context);
                    },
                    {
                        docs: `
                            Gets the value of the field at the defined index.
                            Only supported on objects, and does NOT take the proto chain into account.
                            Params:
                                - 0: the index to access, must be a valid index (string or integer >= 0)
                                - "self": object on which to get the field
                            Returns:
                                The found value
                        `
                    }
                )
            ),
            id(objectProto).assignField(
                "set",
                jsFun(
                    (args, context) => {
                        const self = args.getField(SemanticFieldNames.SELF, context);
                        assertObject(self, "self argument of set");
                        const value = args.getFieldEntry(1, context);
                        self.setLocalField(assertIndex(args.getField(0, context)), value, context);
                        return value;
                    },
                    {
                        docs: `
                            Sets the value of the field at the defined index.
                            Only supported on objects, and does NOT take the proto chain into account.
                            Params:
                                - 0: the index to access, must be a valid index (string or integer >= 0)
                                - 1: the value to assign
                                - "self": object on which to set the field
                            Returns:
                                The assigned value
                        `
                    }
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
                    docs: `
                        Transforms the input to a string and returns it.
                        If the input is null, returns null directly, otherwise calls toString on the input
                        Params:
                            - 0: the input to transform
                        Returns:
                            The string representation
                    `
                }
            )
        )
    ]
};
