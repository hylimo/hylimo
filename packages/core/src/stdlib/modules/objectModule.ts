import { DefaultModuleNames } from "../defaultModuleNames.js";
import { InterpreterModule } from "../../runtime/interpreter/interpreterModule.js";
import { assign, fun, id, jsFun, native, num, str } from "../../runtime/executableAstHelper.js";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames.js";
import { assertFunction, assertIndex, assertNumber, assertObject, isObject } from "../typeHelpers.js";
import type { LabeledValue } from "../../runtime/objects/labeledValue.js";
import { generateArgs } from "../../runtime/objects/generateArgs.js";
import { or } from "../../types/or.js";
import { stringType } from "../../types/string.js";
import { numberType } from "../../types/number.js";
import { objectType } from "../../types/object.js";
import { functionType } from "../../types/function.js";
import { ExecutableConstExpression } from "../../runtime/ast/executableConstExpression.js";
import { ExecutableNativeExpression } from "../../runtime/ast/executableNativeExpression.js";
import { optional } from "../../types/null.js";

/**
 * Name of the temporary field where the object prototype is assigned
 */
const objectProto = "objectProto";

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
                        const self = args.getSelfField(SemanticFieldNames.SELF, context).value;
                        const maxDepthObject = args.getSelfField("maxDepth", context).value;
                        const maxDepth = maxDepthObject.isNull ? 3 : assertNumber(maxDepthObject);
                        return context.newString(self.toString(context, maxDepth));
                    },
                    {
                        docs: "Creates and returns a string representation.",
                        params: [
                            [SemanticFieldNames.SELF, "the input which is transformed to a string"],
                            [
                                "maxDepth",
                                "how many layers of objects to recurse into. Defaults to 3.",
                                optional(numberType)
                            ]
                        ],
                        returns: "The string representation"
                    }
                )
            ),
            id(objectProto).assignField(
                "get",
                jsFun(
                    (args, context) => {
                        const self = args.getSelfFieldValue(SemanticFieldNames.SELF, context);
                        return self.getSelfField(assertIndex(args.getSelfFieldValue(0, context)), context);
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
                        const self = args.getSelfFieldValue(SemanticFieldNames.SELF, context);
                        assertObject(self);
                        return self.getLocalField(assertIndex(args.getSelfFieldValue(0, context)), context, self);
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
                        const self = args.getSelfFieldValue(SemanticFieldNames.SELF, context);
                        assertObject(self);
                        self.deleteField(assertIndex(args.getSelfFieldValue(0, context)));
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
                        const self = args.getSelfFieldValue(SemanticFieldNames.SELF, context);
                        assertObject(self);
                        const value = args.getSelfField(1, context);
                        self.setSelfLocalField(assertIndex(args.getSelfFieldValue(0, context)), value, context);
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
                        const self = args.getSelfFieldValue(SemanticFieldNames.SELF, context);
                        assertObject(self);
                        const key = assertIndex(args.getSelfFieldValue(0, context));
                        const getter = args.getSelfFieldValue(1, context);
                        const setter = args.getSelfFieldValue(2, context);
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
                        const self = args.getSelfFieldValue(SemanticFieldNames.SELF, context);
                        const callback = args.getSelfFieldValue(0, context);
                        assertFunction(callback, "first positional argument of forEach");
                        assertObject(self, "self argument of forEach");
                        let lastValue: LabeledValue = { value: context.null };
                        self.fields.forEach((value, key) => {
                            const keyExpression = typeof key === "string" ? str(key) : num(key);
                            lastValue = callback.invoke(
                                [{ value: new ExecutableConstExpression(value) }, { value: keyExpression }],
                                context,
                                undefined,
                                undefined
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
                        const self = args.getSelfFieldValue(SemanticFieldNames.SELF, context);
                        const other = args.getSelfFieldValue(0, context);
                        return context.newBoolean(self.equals(other));
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
        ),
        assign(
            "isObject",
            jsFun(
                (args, context) => {
                    return context.newBoolean(isObject(args.getSelfFieldValue(0, context)));
                },
                {
                    docs: "Checks if the provided value is an object.",
                    params: [[0, "the value to check"]],
                    returns: "true if the value is an object"
                }
            )
        )
    ]
);
