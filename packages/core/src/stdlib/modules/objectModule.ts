import { DefaultModuleNames } from "../defaultModuleNames.js";
import { InterpreterModule } from "../../runtime/interpreter/interpreterModule.js";
import { assign, fun, id, jsFun, native, num, str } from "../../runtime/executableAstHelper.js";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames.js";
import { assertFunction, assertObject } from "../typeHelpers.js";
import { BaseObject } from "../../runtime/objects/baseObject.js";
import { LabeledValue } from "../../runtime/objects/labeledValue.js";
import { StringObject } from "../../runtime/objects/stringObject.js";
import { NumberObject } from "../../runtime/objects/numberObject.js";
import { RuntimeError } from "../../runtime/runtimeError.js";
import { generateArgs } from "../../runtime/objects/generateArgs.js";
import { or } from "../../types/or.js";
import { stringType } from "../../types/string.js";
import { numberType } from "../../types/number.js";
import { objectType } from "../../types/object.js";
import { functionType } from "../../types/function.js";
import { ExecutableConstExpression } from "../../runtime/ast/executableConstExpression.js";
import { ExecutableNativeExpression } from "../../runtime/ast/executableNativeExpression.js";

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
 * Adds toString function and functions on object
 */
export const objectModule = InterpreterModule.create(
    DefaultModuleNames.OBJECT,
    [],
    [DefaultModuleNames.COMMON],
    [
        fun([
            assign(objectProto, new ExecutableNativeExpression((context) => ({ value: context.objectPrototype }))),
            id(objectProto).assignField(
                "toString",
                jsFun(
                    (args, context) => {
                        const self = args.getField(SemanticFieldNames.SELF, context).value;
                        return context.newString(self.toString(context));
                    },
                    {
                        docs: "Creates and returns a string representation.",
                        params: [[SemanticFieldNames.SELF, "the input which is transformed to a string"]],
                        returns: "The string representation"
                    }
                )
            ),
            id(objectProto).assignField(
                "get",
                jsFun(
                    (args, context) => {
                        const self = args.getFieldValue(SemanticFieldNames.SELF, context);
                        return self.getField(assertIndex(args.getFieldValue(0, context)), context);
                    },
                    {
                        docs: "Gets the field at the defined index. Takes the proto chain into account.",
                        params: [
                            [
                                0,
                                "the index to access, must be a valid index (string or integer >= 0)",
                                or(stringType, numberType)
                            ],
                            [SemanticFieldNames.SELF, "where to access the field", objectType()]
                        ],
                        returns: "The found value"
                    }
                )
            ),
            id(objectProto).assignField(
                "rawGet",
                jsFun(
                    (args, context) => {
                        const self = args.getFieldValue(SemanticFieldNames.SELF, context);
                        assertObject(self);
                        return self.getLocalField(assertIndex(args.getFieldValue(0, context)), context);
                    },
                    {
                        docs: "Gets the value of the field at the defined index. Only supported on objects, and does NOT take the proto chain into account.",
                        params: [
                            [
                                0,
                                "the index to access, must be a valid index (string or integer >= 0)",
                                or(stringType, numberType)
                            ],
                            [SemanticFieldNames.SELF, "object on which to get the field", objectType()]
                        ],
                        returns: "The found value"
                    }
                )
            ),
            id(objectProto).assignField(
                "delete",
                jsFun(
                    (args, context) => {
                        const self = args.getFieldValue(SemanticFieldNames.SELF, context);
                        assertObject(self);
                        self.deleteField(assertIndex(args.getFieldValue(0, context)));
                        return context.null;
                    },
                    {
                        docs: "Deletes the field at the defined index. Only supported on objects, and does NOT take the proto chain into account.",
                        params: [
                            [
                                0,
                                "the index to delete, must be a valid index (string or integer >= 0)",
                                or(stringType, numberType)
                            ],
                            [SemanticFieldNames.SELF, "object on which to delete the field", objectType()]
                        ],
                        returns: "null"
                    }
                )
            ),
            id(objectProto).assignField(
                "set",
                jsFun(
                    (args, context) => {
                        const self = args.getFieldValue(SemanticFieldNames.SELF, context);
                        assertObject(self);
                        const value = args.getField(1, context);
                        self.setLocalField(assertIndex(args.getFieldValue(0, context)), value, context);
                        return value;
                    },
                    {
                        docs: "Sets the value of the field at the defined index. Only supported on objects, and does NOT take the proto chain into account.",
                        params: [
                            [
                                0,
                                "the index to access, must be a valid index (string or integer >= 0)",
                                or(stringType, numberType)
                            ],
                            [1, "the value to assign"],
                            [SemanticFieldNames.SELF, "object on which to set the field", objectType()]
                        ],
                        returns: "The assigned value"
                    }
                )
            ),
            id(objectProto).assignField(
                "defineProperty",
                jsFun(
                    (args, context) => {
                        const self = args.getFieldValue(SemanticFieldNames.SELF, context);
                        assertObject(self);
                        const key = assertIndex(args.getFieldValue(0, context));
                        const getter = args.getFieldValue(1, context);
                        const setter = args.getFieldValue(2, context);
                        assertFunction(getter, "getter");
                        assertFunction(setter, "setter");
                        self.defineProperty(key, getter, setter);
                        return context.null;
                    },
                    {
                        docs: "Defines a property on the object. Only supported on objects, and does NOT take the proto chain into account.",
                        params: [
                            [0, "the key of the property"],
                            [1, "the getter function", functionType],
                            [2, "the setter function", functionType],
                            [SemanticFieldNames.SELF, "object on which to define the property", objectType()]
                        ],
                        returns: "null"
                    }
                )
            ),
            id(objectProto).assignField(
                "forEach",
                jsFun(
                    (args, context) => {
                        const self = args.getFieldValue(SemanticFieldNames.SELF, context);
                        const callback = args.getFieldValue(0, context);
                        assertFunction(callback, "first positional argument of forEach");
                        assertObject(self, "self argument of forEach");
                        let lastValue: LabeledValue = { value: context.null };
                        self.fields.forEach((value, key) => {
                            const keyExpression = typeof key === "string" ? str(key) : num(key);
                            lastValue = callback.invoke(
                                [{ value: new ExecutableConstExpression(value) }, { value: keyExpression }],
                                context
                            );
                        });
                        return lastValue;
                    },
                    {
                        docs: "Iterates over all fields of self and calls the callback with the value and key of the field. Includes the proto field. Does not guarantee any order of the visited fields.",
                        params: [
                            [0, "the callback, called with two positional parameters (value and key)", functionType],
                            [SemanticFieldNames.SELF, "the object on which all fields are iterated", objectType()]
                        ],
                        returns: "The result of the last call to the callback or null if the object is empty."
                    }
                )
            ),
            id(objectProto).assignField(
                "==",
                jsFun(
                    (args, context) => {
                        const self = args.getFieldValue(SemanticFieldNames.SELF, context);
                        const other = args.getFieldValue(0, context);
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
        ]).call(),
        assign(
            "object",
            native(
                (args, context, _staticScope, callExpression) => {
                    args.shift();
                    const evaluatedArgs = generateArgs(args, context, undefined, callExpression);
                    return { value: evaluatedArgs };
                },
                {
                    docs: "Function which returns its arguments. Can be used to construct an object",
                    params: [[0, "all positional arguments: any"]],
                    returns: "An object with all provided params"
                }
            )
        )
    ]
);
