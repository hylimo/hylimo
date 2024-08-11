import { ExecutableNativeExpression } from "../../runtime/ast/executableNativeExpression.js";
import { assign, fun, id, jsFun } from "../../runtime/executableAstHelper.js";
import { InterpreterModule } from "../../runtime/interpreter.js";
import { StringObject } from "../../runtime/objects/stringObject.js";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames.js";
import { stringType } from "../../types/string.js";
import { DefaultModuleNames } from "../defaultModuleNames.js";
import { assertString } from "../typeHelpers.js";

/**
 * Name of the temporary field where the string prototype is assigned
 */
const stringProto = "stringProto";

/**
 * String module providing string functionality
 */
export const stringModule = InterpreterModule.create(
    DefaultModuleNames.STRING,
    [],
    [DefaultModuleNames.COMMON],
    [
        fun([
            assign(stringProto, new ExecutableNativeExpression((context) => ({ value: context.stringPrototype }))),
            id(stringProto).assignField(
                "<",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertString(args.getField(SemanticFieldNames.SELF, context)) <
                                assertString(args.getField(0, context))
                        );
                    },
                    {
                        docs: 'Performs "<" comparison of two strings.',
                        params: [
                            ["self", "the left side of the comparison, must be a string", stringType],
                            [0, "the right side of the comparison, must be a string", stringType]
                        ],
                        returns: "true if the left side is less than the right side"
                    }
                )
            ),
            id(stringProto).assignField(
                ">",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertString(args.getField(SemanticFieldNames.SELF, context)) >
                                assertString(args.getField(0, context))
                        );
                    },
                    {
                        docs: 'Performs ">" comparison of two strings.',
                        params: [
                            ["self", "the left side of the comparison, must be a string", stringType],
                            [0, "the right side of the comparison, must be a string", stringType]
                        ],
                        returns: "true if the left side is greater than the right side"
                    }
                )
            ),
            id(stringProto).assignField(
                "<=",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertString(args.getField(SemanticFieldNames.SELF, context)) <=
                                assertString(args.getField(0, context))
                        );
                    },
                    {
                        docs: 'Performs "<=" comparison of two strings.',
                        params: [
                            ["self", "the left side of the comparison, must be a string", stringType],
                            [0, "the right side of the comparison, must be a string", stringType]
                        ],
                        returns: "true if the left side is less than or equal to the right side"
                    }
                )
            ),
            id(stringProto).assignField(
                ">=",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertString(args.getField(SemanticFieldNames.SELF, context)) >=
                                assertString(args.getField(0, context))
                        );
                    },
                    {
                        docs: 'Performs ">=" comparison of two strings.',
                        params: [
                            ["self", "the left side of the comparison, must be a string", stringType],
                            [0, "the right side of the comparison, must be a string", stringType]
                        ],
                        returns: "true if the left side is greater than or equal to the right side"
                    }
                )
            ),
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
                        return context.newBoolean(res);
                    },
                    {
                        docs: "Compares self to another value, returns true if they are the same string.",
                        params: [
                            ["self", "a string to compare", stringType],
                            [0, "other value for the comparison"]
                        ],
                        returns: "true iff both values are the same string"
                    }
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
                        docs: "Concatenates two strings.",
                        params: [
                            ["self", "a string to concatenate", stringType],
                            [0, "other value to concatenate", stringType]
                        ],
                        returns: "concatenation of the two strings"
                    }
                )
            )
        ]).call()
    ]
);
