import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable version of InvocationArgument
 */
export interface ExecutableListEntry {
    /**
     * The optional name of the argument
     */
    name?: string;
    /**
     * Evaluated to be the value of the argument
     */
    value: ExecutableExpression<any>;
}
