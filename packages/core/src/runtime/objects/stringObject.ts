import { FullObject } from "./fullObject";
import { LiteralObject } from "./literalObject";

/**
 * Represents a String
 */
export class StringObject extends LiteralObject<string> {
    /**
     * Creates a new String
     *
     * @param value the js string this the created object represents
     * @param proto the prototype of the String
     */
    constructor(value: string, proto: FullObject) {
        super(value, proto);
    }

    override toString(): string {
        return this.value;
    }
}
