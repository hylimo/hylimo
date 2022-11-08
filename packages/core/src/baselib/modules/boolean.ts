import { assign, fun, id, native } from "../../parser/astHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { FullObject } from "../../runtime/objects/fullObject";
import { LiteralObject } from "../../runtime/objects/literal";
import { RuntimeError } from "../../runtime/runtimeError";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { DefaultModuleNames } from "../defaultModuleNames";

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
export function assertBoolean(value: any, description: string): boolean {
    if (!(value instanceof BooleanObject)) {
        throw new RuntimeError(`${description} is not a boolean`);
    }
    return value.value;
}

const booleanProto = "booleanProto";

export const booleanModule: InterpreterModule = {
    name: DefaultModuleNames.BOOLEAN,
    dependencies: [],
    expressions: [
        assign("true", id("null")),
        assign("false", id("null")),
        fun([
            assign(booleanProto, id(SemanticFieldNames.ARGS)),
            assign(
                "true",
                native((args, context) => new BooleanObject(true, args.getField(1, context) as FullObject)).call(
                    id(booleanProto)
                )
            ),
            assign(
                "false",
                native((args, context) => new BooleanObject(false, args.getField(1, context) as FullObject)).call(
                    id(booleanProto)
                )
            ),
            id(booleanProto).assignField(
                "&&",
                native(
                    (args, context) => {
                        const first = assertBoolean(args.getField(0, context), "first argument of &&");
                        const second = assertBoolean(args.getField(1, context), "second argument of &&");
                        if (first && second) {
                            return context.getField("true");
                        } else {
                            return context.getField("false");
                        }
                    },
                    { docs: "Performs logical and (&&). Expects two parameters, both boolean. Not semistrict!" }
                )
            ),
            id(booleanProto).assignField(
                "&&",
                native(
                    (args, context) => {
                        const first = assertBoolean(args.getField(0, context), "first argument of &&");
                        const second = assertBoolean(args.getField(1, context), "second argument of &&");
                        if (first || second) {
                            return context.getField("true");
                        } else {
                            return context.getField("false");
                        }
                    },
                    { docs: "Performs logical or (||). Expects two parameters, both boolean. Not semistrict!" }
                )
            )
        ]).call()
    ]
};
