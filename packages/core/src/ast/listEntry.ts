import { Expression } from "./expression";

/**
 * A list entry either for function invokation or object expression
 */
export interface ListEntry {
    /**
     * The optional name of the argument
     */
    name?: string;
    /**
     * Evaluated to be the value of the argument
     */
    value: Expression;
}
