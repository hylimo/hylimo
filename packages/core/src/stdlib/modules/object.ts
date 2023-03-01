import { DefaultModuleNames } from "../defaultModuleNames";
import { InterpreterModule } from "../../runtime/interpreter";
import { assign, fun, id, jsFun, native, num, str } from "../../parser/astHelper";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { assertFunction, assertObject } from "../typeHelpers";
import { BaseObject } from "../../runtime/objects/baseObject";
import { StringObject } from "../../runtime/objects/string";
import { NumberObject } from "../../runtime/objects/number";
import { RuntimeError } from "../../runtime/runtimeError";
import { toBoolean } from "./boolean";
import { generateArgs } from "../../runtime/objects/function";
import { or } from "../../types/or";
import { stringType } from "../../types/string";
import { numberType } from "../../types/number";
import { objectType } from "../../types/object";
import { functionType } from "../../types/function";
import { ExecutableConstExpression } from "../../runtime/ast/executableConstExpression";
import { ExecutableStringLiteralExpression } from "../../runtime/ast/executableStringLiteralExpression";
import { ExecutableNumberLiteralExpression } from "../../runtime/ast/executableNumberLiteralExpression";

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
export const objectModule = InterpreterModule.create(
    DefaultModuleNames.OBJECT,
    [],
    [DefaultModuleNames.COMMON, DefaultModuleNames.BOOLEAN],
    [
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
                        return self.getFieldEntry(assertIndex(args.getField(0, context)), context);
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
                    },
                    [[0, or(stringType, numberType)]]
                )
            ),
            id(objectProto).assignField(
                "rawGet",
                jsFun(
                    (args, context) => {
                        const self = args.getField(SemanticFieldNames.SELF, context);
                        assertObject(self);
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
                    },
                    [
                        [0, or(stringType, numberType)],
                        [SemanticFieldNames.SELF, objectType()]
                    ]
                )
            ),
            id(objectProto).assignField(
                "set",
                jsFun(
                    (args, context) => {
                        const self = args.getField(SemanticFieldNames.SELF, context);
                        assertObject(self);
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
                    },
                    [
                        [0, or(stringType, numberType)],
                        [SemanticFieldNames.SELF, objectType()]
                    ]
                )
            ),
            id(objectProto).assignField(
                "forEach",
                jsFun(
                    (args, context) => {
                        const self = args.getField(SemanticFieldNames.SELF, context);
                        const callback = args.getField(0, context);
                        assertFunction(callback, "first positional argument of forEach");
                        assertObject(self, "self argument of forEach");
                        self.fields.forEach((value, key) => {
                            const keyExpression =
                                typeof key === "string"
                                    ? new ExecutableStringLiteralExpression(str(key))
                                    : new ExecutableNumberLiteralExpression(num(key));
                            callback.invoke(
                                [{ value: ExecutableConstExpression.of(value) }, { value: keyExpression }],
                                context
                            );
                        });
                        return context.null;
                    },
                    {
                        docs: `
                            Iterates over all fields of self and calls the callback with the value and key of the field.
                            Includes the proto field.
                            Does not guarantee any order of the visited fields.
                            Params:
                                - "self": the object on which all fields are iterated
                                - 0: the callback, called with two positional parameters (value and key)
                            Returns:
                                null
                        `
                    },
                    [
                        [0, functionType],
                        [SemanticFieldNames.SELF, objectType()]
                    ]
                )
            ),
            id(objectProto).assignField(
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
        ]).call(),
        assign(
            "object",
            native(
                (args, context) => {
                    args.shift();
                    const evaluatedArgs = generateArgs(args, context);
                    return { value: evaluatedArgs };
                },
                {
                    docs: `
                        Function which returns its arguments. Can be used to construct an object
                        Params:
                            any
                        Returns:
                            An object with all provided params
                    `
                }
            )
        )
    ]
);
