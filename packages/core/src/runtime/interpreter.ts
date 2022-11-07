import { FullObject } from "./objects/fullObject";
import { Null } from "./objects/null";

/**
 * Contex passed during the execution of the interpreter
 */
export interface InterpreterContext {
    /**
     * Singleton considered "null"
     */
    readonly null: Null;
    /**
     * Prototype for all created table objects
     */
    readonly objectPrototype: FullObject;
    /**
     * Prototype for number objects
     */
    readonly numberPrototype: FullObject;
    /**
     * Prototype for string objects
     */
    readonly stringPrototype: FullObject;
    /**
     * Prototype for all created DSL functions
     */
    readonly functionPrototype: FullObject;
    /**
     * Prototype for all native js functions
     */
    readonly nativeFunctionPrototype: FullObject;
    /**
     * The maximum amount of execution steps.
     * currentExecutionSteps should never exceed this number.
     */
    readonly maxExecutionSteps: number;
    /**
     * The current amount of execution steps.
     * Should never get larger than maxExecutionSteps.
     * Each action which can lead to infinite loops should (e.g. jumps) should increase this counter
     */
    currentExecutionSteps: number;
    /**
     * Current execution scope.
     * Code modifying this is responsible for recreating the correct scope afterwards.
     * No automatic management is performed.
     */
    currentScope: FullObject;
}
