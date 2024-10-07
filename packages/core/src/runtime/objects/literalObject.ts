import { BaseObject, SimpleObject } from "./baseObject.js";
import { FullObject } from "./fullObject.js";

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
    constructor(
        readonly value: T,
        proto: FullObject
    ) {
        super(proto);
    }

    override toString(): string {
        return `${this.value}`;
    }

    override toNative(): any {
        return this.value;
    }

    override equals(other: BaseObject): boolean {
        return other instanceof LiteralObject && this.value === other.value;
    }
}
