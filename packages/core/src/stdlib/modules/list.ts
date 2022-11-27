import { ConstExpression } from "../../parser/ast";
import { assign, fun, id, jsFun, num } from "../../parser/astHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { RuntimeError } from "../../runtime/runtimeError";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertFunction, assertNumber } from "../typeHelpers";

/**
 * Name of the temporary field where the list prototype is assigned
 */
const listProto = "listProto";

/**
 * Name of the field where the length of the list is stored
 */
const lengthField = "length";

/**
 * List module providing a list data structure
 */
export const listModule: InterpreterModule = {
    name: DefaultModuleNames.LIST,
    dependencies: [DefaultModuleNames.OBJECT],
    runtimeDependencies: [DefaultModuleNames.COMMON],
    expressions: [
        assign(
            "list",
            fun([
                assign(listProto, id("object").call()),
                id(listProto).assignField(
                    "add",
                    jsFun(
                        (args, context) => {
                            const self = args.getField(SemanticFieldNames.SELF, context);
                            const length = assertNumber(self.getField(lengthField, context), "length field of a list");
                            self.setLocalField(length, args.getFieldEntry(0, context), context);
                            self.setFieldEntry(lengthField, { value: context.newNumber(length + 1) }, context);
                            return context.null;
                        },
                        {
                            docs: `
                                Adds an element to the list.
                                Params:
                                    - "self": the list where to add the element
                                    - 0: the element to add
                                Returns:
                                    null
                            `
                        }
                    )
                ),
                id(listProto).assignField(
                    "remove",
                    jsFun(
                        (args, context) => {
                            const self = args.getField(SemanticFieldNames.SELF, context);
                            const length = assertNumber(self.getField(lengthField, context), "length field of a list");
                            if (length > 0) {
                                const value = self.getFieldEntry(length - 1, context);
                                self.setFieldEntry(length - 1, { value: context.null }, context);
                                self.setFieldEntry(lengthField, { value: context.newNumber(length - 1) }, context);
                                return value;
                            } else {
                                throw new RuntimeError("List empty, nothing to remove");
                            }
                        },
                        {
                            docs: `
                                Removes the last element from the list, throws an error if the list is empty.
                                Params:
                                    - "self": the list from which to remove the last element
                                Returns:
                                    The removed element
                            `
                        }
                    )
                ),
                id(listProto).assignField(
                    "forEach",
                    jsFun(
                        (args, context) => {
                            const self = args.getField(SemanticFieldNames.SELF, context);
                            const callback = args.getField(0, context);
                            assertFunction(callback, "first positional argument of forEach");
                            const length = assertNumber(self.getField(lengthField, context), "length field of a list");
                            for (let i = 0; i < length; i++) {
                                callback.invoke(
                                    [{ value: new ConstExpression(self.getFieldEntry(i, context)) }, { value: num(i) }],
                                    context
                                );
                            }
                            return context.null;
                        },
                        {
                            docs: `
                                Iterates over all entries of self in order and calls the callback with the value and index of the entry.
                                Params:
                                    - "self": the object on which all fields are iterated
                                    - 0: the callback, called with two positional parameters (value and index)
                                Returns:
                                    null
                            `
                        }
                    )
                ),
                fun(
                    [
                        assign("_value", id("object").call()),
                        id("_value").assignField(SemanticFieldNames.PROTO, id(listProto)),
                        id("_value").assignField(lengthField, num(0)),
                        id("_value")
                    ],
                    {
                        docs: `
                        Creates a new empty list
                        Returns:
                            The created empty list
                    `
                    }
                )
            ]).call()
        )
    ]
};