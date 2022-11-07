import { SimpleObject } from "./baseObject";
import { FullObject } from "./fullObject";

/**
 * Represents a String
 */
export class String extends SimpleObject {
    /**
     * Creates a new String
     *
     * @param value the js string this the created object represents
     * @param proto the prototype of the String
     */
    constructor(readonly value: string, proto: FullObject) {
        super(proto);
    }
}
