import { FullObject } from "./objects/fullObject";
import { Null } from "./objects/null";

/**
 * Contex passed during the execution of the interpreter
 */
export interface InterpreterContext {
    /**
     * Prototype for number objects
     */
    numberPrototype: FullObject;
    /**
     * Prototype for string objects
     */
    stringPrototype: FullObject;
    /**
     * Prototype for all created table objects
     */
    objectPrototype: FullObject;
    /**
     * Prototype for all created DSL functions
     */
    functionPrototype: FullObject;
    /**
     * Prototype for all native js functions
     */
    nativeFunctionPrototype: FullObject;
    /**
     * Singleton considered "null"
     */
    null: Null;
}
