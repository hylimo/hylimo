import type { ExecutableExpression, InterpreterModule, ParseableExpressions, Type } from "@hylimo/core";
import { parse } from "@hylimo/core";

/**
 * Config property
 * Consists of a name, a description, a type and an executable expression evaluating to the default value
 */
export type ConfigProperty = [string, string, Type, ExecutableExpression];

/**
 * Diagram content module
 */
export interface ContentModule extends InterpreterModule {
    /**
     * List of config properties for the module
     */
    config: [string, string, Type, ExecutableExpression][];
}

export namespace ContentModule {
    /**
     * Creates a new ContentModule based on the provided name, dependencies, expressions, and config properties
     *
     * @param name the name of the module
     * @param dependencies dependencies of the module
     * @param runtimeDependencies runtime dependencies of the module
     * @param expressions expressions to execute to load the module
     * @param config optional config properties for the module
     * @returns the created module
     */
    export function create(
        name: string,
        dependencies: string[],
        runtimeDependencies: string[],
        expressions: ParseableExpressions,
        config?: [string, string, Type, ExecutableExpression][]
    ): ContentModule {
        return {
            name,
            dependencies,
            runtimeDependencies,
            expressions: parse(expressions),
            config: config ?? []
        };
    }
}
