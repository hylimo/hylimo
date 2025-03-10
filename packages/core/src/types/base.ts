import type { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import type { BaseObject } from "../runtime/objects/baseObject.js";

/**
 * The result of the match function, either true or an object with the current path and reson why it did not match
 */
export type MatchesResult =
    | true
    | {
          path: string[];
          expected: Type;
      };

/**
 * Type for type checking
 */
export interface Type {
    /**
     * The name of the type
     */
    name(): string;
    /**
     * Checks if a value matches the type
     *
     * @param value the value to check
     * @param context current interpreter context
     * @returns true if it matches, oterhwise an object with the reason why it did not match
     */
    matches(value: BaseObject, context: InterpreterContext): MatchesResult;
}
