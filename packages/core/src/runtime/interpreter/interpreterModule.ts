import { ExecutableExpression } from "../ast/executableExpression.js";

/**
 * Module which can be loaded into the interpreter.
 * Has a unique name and can specify dependencies
 * Dependencies have to be loaded before the module
 */

export interface InterpreterModule {
    /**
     * The name of the module, must be unique
     */
    name: string;
    /**
     * Dependencies which must be loaded before this module can be loaded
     * Dependencies must form an acyclic graph, otherwise they cannot be loaded
     */
    dependencies: string[];
    /**
     * Runtime dependencies must be loaded before code provided by this module is used,
     * but may not be loaded before this module is loaded.
     * Therefore, cycles in runtime dependencies are allowed.
     */
    runtimeDependencies: string[];
    /**
     * Expressions to execute to load the module
     */
    expressions: ExecutableExpression<any>[];
}

export namespace InterpreterModule {
    /**
     * Creates a new InterpreterModule based on the provided name, dependencies and expressions
     *
     * @param name the name of the module
     * @param dependencies dependencies of the module
     * @param runtimeDependencies runtime dependencies of the module
     * @param expressions expressions to execute to load the module
     * @returns the created module
     */
    export function create(
        name: string,
        dependencies: string[],
        runtimeDependencies: string[],
        expressions: ExecutableExpression[]
    ): InterpreterModule {
        return {
            name,
            dependencies,
            runtimeDependencies,
            expressions: expressions
        };
    }
}
