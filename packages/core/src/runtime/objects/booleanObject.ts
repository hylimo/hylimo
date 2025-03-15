import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { FullObject } from "./fullObject.js";
import { LiteralObject } from "./literalObject.js";

/**
 * Boolean literal
 */
export class BooleanObject extends LiteralObject<boolean> {
    override getProto(context: InterpreterContext): FullObject {
        return context.booleanPrototype;
    }
}
