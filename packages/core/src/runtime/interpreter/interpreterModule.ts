import { ExecutableExpression } from "../ast/executableExpression.js";
import { parse, ParseableExpressions } from "../executableAstHelper.js";

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

/**
 * Helper data structure for topological sorting of modules
 */
interface MarkedModule {
    /**
     * The module itself
     */
    module: InterpreterModule;
    /**
     * If true, the module has been added to the list of modules
     */
    mark: boolean;
    /**
     * If visited with true, a cycle was detected
     */
    temporaryMark: boolean;
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
        expressions: ParseableExpressions
    ): InterpreterModule {
        return {
            name,
            dependencies,
            runtimeDependencies,
            expressions: parse(expressions)
        };
    }

    /**
     * Computes the order in which modules have to be loaded
     *
     * @param requiredModules the modules which have to be loaded
     * @param optionalModules the modules which are only loaded if required by any required module
     * @returns the ordered list of modules
     */
    export function computeModules<T extends InterpreterModule>(requiredModules: T[], optionalModules: T[]): T[] {
        const markedModules = requiredModules.map((module) => ({ module, mark: false, temporaryMark: false }));
        const markedOptionalModules = optionalModules.map((module) => ({ module, mark: false, temporaryMark: false }));
        const moduleLookup = new Map<string, (typeof markedModules)[0]>();
        const modules: T[] = [];
        for (const module of markedModules) {
            if (moduleLookup.has(module.module.name)) {
                throw new Error(`Duplicate module ${module.module.name}`);
            }
            moduleLookup.set(module.module.name, module);
        }
        for (const module of markedOptionalModules) {
            if (!moduleLookup.has(module.module.name)) {
                moduleLookup.set(module.module.name, module);
            }
        }
        for (const module of markedModules) {
            visit(module, moduleLookup, modules);
        }
        return modules;
    }

    /**
     * Topological sorting helper for modules
     * Detects cycles and missing modules.
     *
     * @param module the current visited module
     * @param moduleLookup mapping of all known modules
     * @param modules the list of modules to add the current module to
     */
    function visit(module: MarkedModule, moduleLookup: Map<string, MarkedModule>, modules: InterpreterModule[]): void {
        if (module.temporaryMark) {
            throw new Error(`Cycle in module dependencies: ${module.module.name}`);
        }
        if (!module.mark) {
            module.temporaryMark = true;
            visitDependencies(module.module.dependencies, moduleLookup, modules);
            module.temporaryMark = false;
            module.mark = true;
            modules.push(module.module);
            visitDependencies(module.module.runtimeDependencies, moduleLookup, modules);
        }
    }

    /**
     * Visits each dependency in dependencies.
     * Used for visit. Detects cycles and missing modules.
     *
     * @param dependencies the dependencies to visit, must be existant in moduleLookup
     * @param moduleLookup lookup from depenency name to module
     * @param modules the list of modules to add the dependencies to
     */
    function visitDependencies(
        dependencies: string[],
        moduleLookup: Map<string, MarkedModule>,
        modules: InterpreterModule[]
    ): void {
        for (const child of dependencies) {
            const childModule = moduleLookup.get(child);
            if (!childModule) {
                throw new Error(`Unknown module dependency: ${child}`);
            }
            visit(childModule, moduleLookup, modules);
        }
    }
}
