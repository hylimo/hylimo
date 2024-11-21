import { BaseObject, SimpleObject } from "./baseObject.js";

/**
 * Represents a js literal.
 * Allows to create custom literals wrapping some JS functionality.
 * If better toString functionality is required, toString must be overwritten
 */
export abstract class LiteralObject<T> extends SimpleObject {
    /**
     * Creates a new String
     *
     * @param value the js literal this the created object represents
     */
    constructor(readonly value: T) {
        super();
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
