import { FullObject } from "./fullObject";
import { LiteralObject } from "./literal";

/**
 * Represents a Number
 */
export class NumberObject extends LiteralObject<number> {
    /**
     * Creates a new Number
     *
     * @param value the js number this the created object represents
     * @param proto the prototype of the Number
     */
    constructor(value: number, proto: FullObject) {
        super(value, proto);
    }
}
