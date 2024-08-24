import { ExecutableExpression } from "../ast/executableExpression.js";
import { BaseObject } from "../objects/baseObject.js";
import { FullObject } from "../objects/fullObject.js";
import { RuntimeError } from "../runtimeError.js";
import { InterpreterContext } from "./interpreterContext.js";
import { InterpreterModule } from "./interpreterModule.js";

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

/**
 * The result of an interpreter run
 */
export interface InterpretationResult {
    /**
     * The result of the execution
     */
    result?: BaseObject;
    /**
     * The global scope, can be used to process results
     * Only provided if no error was thrown
     */
    globalScope?: FullObject;
    /**
     * If existing, the error which caused the abortion of the execution
     */
    error?: RuntimeError;
}

/**
 * Interpreter able to execute scripts
 * Must be reset after each execution
 */
export class Interpreter {
    /**
     * Sorted consistent modules loaded before each execution
     */
    private readonly modules: InterpreterModule[] = [];

    /**
     * Creates a new Interpreter.
     * Provided modules are checked for consistency and oredered.
     * An error is thrown if a module has unsatisfied dependencies,
     *
     * @param modules loaded modules
     * @param maxExecutionSteps the maximum number of steps the interpreter is allowed to execute
     */
    constructor(
        modules: InterpreterModule[],
        private readonly maxExecutionSteps: number
    ) {
        const markedModules = modules.map((module) => ({ module, mark: false, temporaryMark: false }));
        const moduleLookup = new Map<string, (typeof markedModules)[0]>();
        for (const module of markedModules) {
            if (moduleLookup.has(module.module.name)) {
                throw new Error(`Duplicate module ${module.module.name}`);
            }
            moduleLookup.set(module.module.name, module);
        }
        for (const module of markedModules) {
            this.visit(module, moduleLookup);
        }
    }

    /**
     * Topological sorting helper for modules
     * Detects cycles and missing modules.
     *
     * @param module the current visited module
     * @param moduleLookup mapping of all known modules
     */
    private visit(module: MarkedModule, moduleLookup: Map<string, MarkedModule>): void {
        if (module.temporaryMark) {
            throw new Error(`Cycle in module dependencies: ${module.module.name}`);
        }
        if (!module.mark) {
            module.temporaryMark = true;
            this.visitDependencies(module.module.dependencies, moduleLookup);
            module.temporaryMark = false;
            module.mark = true;
            this.modules.push(module.module);
            this.visitDependencies(module.module.runtimeDependencies, moduleLookup);
        }
    }

    /**
     * Visits each dependency in dependencies.
     * Used for visit. Detects cycles and missing modules.
     *
     * @param dependencies the dependencies to visit, must be existant in moduleLookup
     * @param moduleLookup lookup from depenency name to module
     */
    private visitDependencies(dependencies: string[], moduleLookup: Map<string, MarkedModule>) {
        for (const child of dependencies) {
            const childModule = moduleLookup.get(child);
            if (!childModule) {
                throw new Error(`Unknown module dependency: ${child}`);
            }
            this.visit(childModule, moduleLookup);
        }
    }

    /**
     * Evalutes a list of expressions with all modules loaded
     *
     * @param expressions the expressions to evaluate
     * @returns the result of the interpretation, consting of a scope or an error
     */
    run(expressions: ExecutableExpression<any>[]): InterpretationResult {
        const context = new InterpreterContext(
            this.maxExecutionSteps,
            this.modules.map((module) => module.name)
        );
        try {
            for (const module of this.modules) {
                for (const expression of module.expressions) {
                    expression.evaluate(context);
                }
            }
            let previousResult: BaseObject = context.null;
            for (const expression of expressions) {
                previousResult = expression.evaluate(context).value;
            }
            return { result: previousResult, globalScope: context.currentScope };
        } catch (e: any) {
            if (Array.isArray(e.interpretationStack)) {
                return { error: e };
            } else {
                throw e;
            }
        }
    }
}
