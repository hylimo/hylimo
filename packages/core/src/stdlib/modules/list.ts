import { ConstExpression } from "../../parser/ast";
import { assign, fun, id, jsFun, native, num } from "../../parser/astHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { BaseObject } from "../../runtime/objects/baseObject";
import { FullObject } from "../../runtime/objects/fullObject";
import { generateArgs } from "../../runtime/objects/function";
import { RuntimeError } from "../../runtime/runtimeError";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { Type } from "../../types/base";
import { functionType } from "../../types/function";
import { listType } from "../../types/list";
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
                            const length = assertNumber(self.getField(lengthField, context));
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
                        },
                        [[SemanticFieldNames.SELF, listType()]]
                    )
                ),
                id(listProto).assignField(
                    "remove",
                    jsFun(
                        (args, context) => {
                            const self = args.getField(SemanticFieldNames.SELF, context);
                            const length = assertNumber(self.getField(lengthField, context));
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
                        },
                        [[SemanticFieldNames.SELF, listType()]]
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
                                    - "self": the list on which all fields are iterated
                                    - 0: the callback, called with two positional parameters (value and index)
                                Returns:
                                    null
                            `
                        },
                        [
                            [SemanticFieldNames.SELF, listType()],
                            [0, functionType]
                        ]
                    )
                ),
                id(listProto).assignField(
                    "map",
                    fun(
                        `
                            callback = it
                            res = list()
                            args.self.forEach {
                                (value, index) = args
                                res.add(callback(value, index))
                            }
                            res
                        `,
                        {
                            docs: `
                                Maps a list to a new list, with the order being preserved
                                Params:
                                    - "self": the list on which all fields are mapped
                                    - 0: the callback, called with two positional parameters (value and index)
                                Returns:
                                    The resulting new list.
                            `
                        },
                        [
                            [SemanticFieldNames.SELF, listType()],
                            [0, functionType]
                        ]
                    )
                ),
                native(
                    (args, context, staticScope) => {
                        const indexOnlyArgs = args.filter((value) => !value.name);
                        const list = generateArgs(indexOnlyArgs, context);
                        list.setLocalField(
                            SemanticFieldNames.PROTO,
                            staticScope.getFieldEntry(listProto, context),
                            context
                        );
                        list.setLocalField(lengthField, { value: context.newNumber(indexOnlyArgs.length) }, context);
                        return { value: list };
                    },
                    {
                        docs: `
                        Creates a new list with the defined elements
                        Params:
                            - 0..*: the elements to add
                        Returns:
                            The created empty list
                    `
                    }
                )
            ]).call()
        )
    ]
};

/**
 * Helper to convert a native list object to a native list
 *
 * @param native the result of toNative() on a list object
 * @returns the list with all values
 */
export function nativeToList(native: { [key: string | number]: any }): any[] {
    let length = native[lengthField];
    if (typeof length !== "number") {
        length = -1;
    }
    const res: any[] = [];
    for (let i = 0; i < length; i++) {
        res.push(native[i]);
    }
    return res;
}

/**
 * Helper to convert a FullObject which is a list to a list of BaseObject.
 * Missing values are replaced with undefined, as access to th null object is not available
 *
 * @param object the object to convert
 * @returns the list with all values
 */
export function objectToList(object: FullObject): (BaseObject | undefined)[] {
    let length = object.getLocalFieldOrUndefined(lengthField)?.value?.toNative();
    if (typeof length !== "number") {
        length = -1;
    }
    const res: (BaseObject | undefined)[] = [];
    for (let i = 0; i < length; i++) {
        res.push(object.getLocalFieldOrUndefined(i)?.value);
    }
    return res;
}
