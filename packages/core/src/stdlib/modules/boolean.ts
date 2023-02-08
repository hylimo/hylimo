import { assign, fun, id, jsFun, native } from "../../parser/astHelper";
import { InterpreterContext, InterpreterModule } from "../../runtime/interpreter";
import { BaseObject } from "../../runtime/objects/baseObject";
import { FullObject } from "../../runtime/objects/fullObject";
import { LiteralObject } from "../../runtime/objects/literal";
import { RuntimeError } from "../../runtime/runtimeError";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { booleanType } from "../../types/boolean";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertSelfShortCircuitArguments } from "../typeHelpers";

/**
 * Boolean literal
 */
export class BooleanObject extends LiteralObject<boolean> {}

/**
 * Helper to check that an object is a BooleanObject, throws an error if not
 *
 * @param value the value to check
 * @param description the description of the value, part of the error message
 * @returns the value of the BooleanObject
 */
export function assertBoolean(value: BaseObject, description = ""): boolean {
    if (!(value instanceof BooleanObject)) {
        throw new RuntimeError(`${description} is not a boolean`);
    }
    return value.value;
}

/**
 * Converts a js boolean to a BooleanObject
 *
 * @param value the js boolean to convert
 * @param context the interpreter context used to access true or false
 * @returns the BooleanObject equivalence of value
 */
export function toBoolean(value: boolean, context: InterpreterContext): BaseObject {
    if (value) {
        return context.getField("true");
    } else {
        return context.getField("false");
    }
}

/**
 * Name of the boolean proto object
 */
const booleanProto = "booleanProto";

/**
 * Boolean module
 * Adds support for booleans
 */
export const booleanModule: InterpreterModule = {
    name: DefaultModuleNames.BOOLEAN,
    dependencies: [DefaultModuleNames.OBJECT],
    runtimeDependencies: [],
    expressions: [
        fun([
            assign(booleanProto, id("object").call()),
            id(SemanticFieldNames.PROTO).assignField(
                "true",
                jsFun((args, context) => new BooleanObject(true, args.getField(0, context) as FullObject)).call(
                    id(booleanProto)
                )
            ),
            id(SemanticFieldNames.PROTO).assignField(
                "false",
                jsFun((args, context) => new BooleanObject(false, args.getField(0, context) as FullObject)).call(
                    id(booleanProto)
                )
            ),
            id(booleanProto).assignField(
                "&&",
                native(
                    (args, context) => {
                        const [first, second] = assertSelfShortCircuitArguments(args, "&&");
                        return {
                            value: toBoolean(
                                assertBoolean(first.evaluate(context).value, "left side of &&") &&
                                    assertBoolean(second.evaluate(context).value, "right side of &&"),
                                context
                            )
                        };
                    },
                    {
                        docs: `
                            Performs logical and (&&).
                            Short circuit evaluation! If self is false, the positional argument is not evaluated
                            Params:
                                - "self": the left side of the logical and, always evaluated
                                - 0: the right side of the logical and, only evaluated if the left side is true
                            Returns:
                                The result of the logical and
                        `
                    }
                )
            ),
            id(booleanProto).assignField(
                "||",
                native(
                    (args, context) => {
                        const [first, second] = assertSelfShortCircuitArguments(args, "||");
                        return {
                            value: toBoolean(
                                assertBoolean(first.evaluate(context).value, "left side of ||") ||
                                    assertBoolean(second.evaluate(context).value, "right side of ||"),
                                context
                            )
                        };
                    },
                    {
                        docs: `
                            Performs logical or (||).
                            Short circuit evaluation! If self is true, the positional argument is not evaluated
                            Params:
                                - "self": the left side of the logical or, always evaluated
                                - 0: the right side of the logical or, only evaluated if the left side is false
                            Returns:
                                The result of the logical or
                        `
                    }
                )
            )
        ]).call(),
        assign(
            "!",
            jsFun(
                (args, context) => {
                    return toBoolean(!assertBoolean(args.getField(0, context)), context);
                },
                {
                    docs: `
                        Negates a boolean
                        Params:
                            0: the boolean to negate
                        Returns:
                            The negated argument
                    `
                },
                [[0, booleanType]]
            )
        )
    ]
};
