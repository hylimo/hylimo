import { assign, fun, id, jsFun, native, num } from "../../runtime/executableAstHelper";
import { ExecutableListEntry } from "../../runtime/ast/executableListEntry";
import { ExecutableConstExpression } from "../../runtime/ast/executableConstExpression";
import { InterpreterModule } from "../../runtime/interpreter";
import { BaseObject, FieldEntry } from "../../runtime/objects/baseObject";
import { FullObject } from "../../runtime/objects/fullObject";
import { generateArgs } from "../../runtime/objects/functionObject";
import { RuntimeError } from "../../runtime/runtimeError";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { functionType } from "../../types/function";
import { listType } from "../../types/list";
import { objectType } from "../../types/object";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertFunction, assertNumber } from "../typeHelpers";
import { numberType } from "../../types/number";
import { optional } from "../../types/null";

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
export const listModule = InterpreterModule.create(
    DefaultModuleNames.LIST,
    [DefaultModuleNames.COMMON],
    [],
    [
        fun([
            assign(listProto, id("object").call()),
            id(listProto).assignField(
                "add",
                jsFun(
                    (args, context) => {
                        const self = args.getField(SemanticFieldNames.SELF, context);
                        const length = assertNumber(self.getField(lengthField, context));
                        self.setLocalField(length, args.getFieldEntry(0, context));
                        self.setFieldEntry(lengthField, { value: context.newNumber(length + 1) }, context);
                        return context.null;
                    },
                    {
                        docs: "Adds an element to the list.",
                        params: [
                            [SemanticFieldNames.SELF, "the list where to add the element", listType()],
                            [0, "the element to add"]
                        ],
                        returns: "null"
                    }
                )
            ),
            id(listProto).assignField(
                "addAll",
                fun(
                    `
                        targetList = args.self
                        it.forEach {
                            targetList.add(it)
                        }
                    `,
                    {
                        docs: "Adds all elements in the provided list to the list.",
                        params: [
                            [SemanticFieldNames.SELF, "the list where to add the elements", listType()],
                            [0, "the list of elements to add", listType()]
                        ],
                        returns: "null"
                    }
                )
            ),
            id(listProto).assignField("+=", id(listProto).field("add")),
            id(listProto).assignField(
                "+",
                fun(
                    `
                        list1 = args.self
                        (list2) = args
                        result = list()
                        result.addAll(list1)
                        result.addAll(list2)
                        result
                    `,
                    {
                        docs: "Merges to lists and createas a new list.",
                        params: [
                            [SemanticFieldNames.SELF, "the first list", listType()],
                            [0, "the second list", listType()]
                        ],
                        returns: "A new list with the elements of both parameters"
                    }
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
                        docs: "Removes the last element from the list, throws an error if the list is empty.",
                        params: [
                            [SemanticFieldNames.SELF, "the list from which to remove the last element", listType()]
                        ],
                        returns: "The removed element"
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
                        let lastValue: FieldEntry = { value: context.null };
                        for (let i = 0; i < length; i++) {
                            lastValue = callback.invoke(
                                [
                                    { value: new ExecutableConstExpression(self.getFieldEntry(i, context)) },
                                    { value: num(i) }
                                ],
                                context
                            );
                        }
                        return lastValue;
                    },
                    {
                        docs: "Iterates over all entries of self in order and calls the callback with the value and index of the entry.",
                        params: [
                            [SemanticFieldNames.SELF, "the list on which all fields are iterated", listType()],
                            [0, "the callback, called with two positional parameters (value and index)", functionType]
                        ],
                        returns: "The result of the last call to the callback or null if the list is empty."
                    }
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
                        docs: "Maps a list to a new list, with the order being preserved",
                        params: [
                            [SemanticFieldNames.SELF, "the list on which all fields are mapped", listType()],
                            [0, "the callback, called with two positional parameters (value and index)", functionType]
                        ],
                        returns: "The resulting new list."
                    }
                )
            ),
            id(SemanticFieldNames.IT).assignField(
                "list",
                native(
                    (args, context, staticScope) => {
                        const indexOnlyArgs = args.filter((value) => !value.name);
                        const list = generateArgs(indexOnlyArgs, context, undefined);
                        list.setLocalField(SemanticFieldNames.PROTO, staticScope.getFieldEntry(listProto, context));
                        list.setLocalField(lengthField, { value: context.newNumber(indexOnlyArgs.length) });
                        return { value: list };
                    },
                    {
                        docs: "Creates a new list with the defined elements",
                        params: [[0, "all positional elements: the elements to add"]],
                        returns: "The created list"
                    }
                )
            ),
            id(SemanticFieldNames.IT).assignField(
                "listWrapper",
                fun(
                    [
                        id(SemanticFieldNames.THIS).assignField("callback", id(SemanticFieldNames.IT)),
                        native((args, context, staticScope) => {
                            const listFunction = staticScope.getField("list", context);
                            const list = listFunction.invoke(args, context);
                            const callback = staticScope.getField("callback", context);
                            const invokeArguments: ExecutableListEntry[] = [
                                { value: new ExecutableConstExpression(list) }
                            ];
                            invokeArguments.push(...args.filter((arg) => arg.name !== undefined));
                            return callback.invoke(invokeArguments, context);
                        })
                    ],
                    {
                        docs: "Creates a function which puts all indexed parameters in a list, and then calls callback with that list. Also provides all named arguments to the callback under the same name.",
                        params: [[0, "the callback to use"]],
                        returns: "The created function"
                    }
                )
            ),
            id(SemanticFieldNames.IT).assignField(
                "toList",
                jsFun(
                    (args, context) => {
                        const objectEntry = args.getFieldEntry(0, context);
                        const object = objectEntry.value as FullObject;
                        object.setLocalField(
                            SemanticFieldNames.PROTO,
                            context.currentScope.getFieldEntry(listProto, context)
                        );
                        const maxKey =
                            Math.max(
                                -1,
                                ...([...object.fields.keys()].filter((key) => typeof key === "number") as number[])
                            ) + 1;
                        object.setLocalField(lengthField, { value: context.newNumber(maxKey) });
                        return objectEntry;
                    },
                    {
                        docs: "Modifies the provided object so that it is a list",
                        params: [[0, "the object to modify", objectType()]],
                        returns: "The modified provided object"
                    }
                )
            ),
            id(SemanticFieldNames.IT).assignField(
                "range",
                fun(
                    `
                        (n, step) = args
                        step = step ?? 1
                        res = list()
                        i = 0
                        while { i < n } {
                            res.add(i)
                            i = i + step
                        }
                        res
                    `,
                    {
                        docs: "Generates a list with a range of numbers from 0 up to n with n < the first parameter.",
                        params: [
                            [0, "the max value", numberType],
                            [1, "optional step size, defaults to 1", optional(numberType)]
                        ],
                        returns: "A list with the generated numbers"
                    }
                )
            )
        ]).call(id(SemanticFieldNames.THIS))
    ]
);

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
