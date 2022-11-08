import { SimpleObject } from "./baseObject";
import { FullObject } from "./fullObject";

/**
 * Represents a js literal.
 * Allows to create custom literals wrapping some JS functionality.
 * If better toString functionality is required, toString must be overwritten
 */
export class LiteralObject<T> extends SimpleObject {
    /**
     * Creates a new String
     *
     * @param value the js literal this the created object represents
     * @param proto the prototype of the literal
     */
    constructor(readonly value: T, proto: FullObject) {
        super(proto);
    }

    override toString(): string {
        return `${this.value}`;
    }
}
