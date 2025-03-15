import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { FullObject } from "./fullObject.js";
import { LiteralObject } from "./literalObject.js";

/**
 * Represents a String
 */
export class StringObject extends LiteralObject<string> {
    override getProto(context: InterpreterContext): FullObject {
        return context.stringPrototype;
    }

    override toString(): string {
        return this.value;
    }
}
