import { SimpleObject } from "./baseObject";
import { FullObject } from "./fullObject";

/**
 * Represents a Number
 */
export class NumberObject extends SimpleObject {
    /**
     * Creates a new Number
     *
     * @param value the js number this the created object represents
     * @param proto the prototype of the Number
     */
    constructor(readonly value: number, proto: FullObject) {
        super(proto);
    }

    override toString(): string {
        return this.value.toString();
    }

    override toNative(): any {
        return this.value;
    }
}
