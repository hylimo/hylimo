import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { FullObject } from "./fullObject.js";
import { LiteralObject } from "./literalObject.js";

/**
 * Represents a Number
 */
export class NumberObject extends LiteralObject<number> {
    override getProto(context: InterpreterContext): FullObject {
        return context.numberPrototype;
    }
}
