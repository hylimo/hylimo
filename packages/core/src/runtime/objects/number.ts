import { SimpleObject } from "./baseObject";
import { FullObject } from "./fullObject";

/**
 * Represents a Number
 */
export class Number extends SimpleObject {
    /**
     * Creates a new Number
     *
     * @param value the js number this the created object represents
     * @param proto the prototype of the Number
     */
    constructor(readonly value: number, proto: FullObject) {
        super(proto);
    }
}
