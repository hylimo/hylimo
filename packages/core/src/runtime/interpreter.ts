import { Expression } from "../ast/ast";
import { toExecutable } from "../parser/astHelper";
import { ExecutableExpression } from "./ast/executableExpression";
import { BaseObject } from "./objects/baseObject";
import { FullObject } from "./objects/fullObject";
import { NullObject } from "./objects/null";
import { NumberObject } from "./objects/number";
import { StringObject } from "./objects/string";
import { RuntimeError } from "./runtimeError";
import { SemanticFieldNames } from "./semanticFieldNames";

/**
 * Default InterpreterContext requiering only the maxExecutionSteps
 */
export class InterpreterContext {
    /**
     * Singleton considered "null"
     */
    readonly null: NullObject;
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
     * The current amount of execution steps.
     * Should never get larger than maxExecutionSteps.
     * Each action which can lead to infinite loops should (e.g. jumps) should increase this counter
     */
    currentExecutionSteps = 0;
    /**
     * Current execution scope.
     * Code modifying this is responsible for recreating the correct scope afterwards.
     * No automatic management is performed.
     */
    currentScope: FullObject;

    /**
     * Map to store module specific values by module
     */
    private readonly moduleValues = new Map<string, Map<string, any>>();

    /**
     * Initial global execution scope
     */
    private readonly globalScope: FullObject;

    /**
     * Creates a new DefaultInterpreterContext
     *
     * @param maxExecutionSteps The maximum amount of execution steps
     */
    constructor(readonly maxExecutionSteps: number, modules: string[]) {
        this.null = new NullObject();
        this.objectPrototype = new FullObject();
        this.numberPrototype = this.newObject();
        this.stringPrototype = this.newObject();
        this.functionPrototype = this.newObject();
        this.nativeFunctionPrototype = this.newObject();
        this.currentScope = this.newObject();
        this.currentScope.setFieldEntry(SemanticFieldNames.THIS, { value: this.currentScope }, this);
        this.globalScope = this.currentScope;
        for (const module of modules) {
            this.moduleValues.set(module, new Map());
        }
    }

    /**
     * Sets a module specific value, ensures that the module actually exists
     *
     * @param module the name of the module
     * @param key the name of the field to access
     * @param value the new value stored under key
     */
    setModuleValue(module: string, key: string, value: any): void {
        this.getModuleMap(module).set(key, value);
    }

    /**
     * Gets a module specific value, ensures that the module actually exists
     *
     * @param module the name of the module
     * @param key the name of the field to access
     * @returns the stored value
     */
    getModuleValue(module: string, key: string): any {
        return this.getModuleMap(module).get(key);
    }

    /**
     * Gets the module specific map of values, throws an Error if no map was found
     *
     * @param module the name of the module
     * @returns the found value
     */
    private getModuleMap(module: string): Map<string, any> {
        const moduleMap = this.moduleValues.get(module);
        if (!moduleMap) {
            throw new Error(`unknown module ${module}`);
        }
        return moduleMap;
    }

    /**
     * Creates a new StringObject with the provided value
     *
     * @param value the value of the string
     * @returns the created object
     */
    newString(value: string): StringObject {
        return new StringObject(value, this.stringPrototype);
    }

    /**
     * Creates a new NumberObject with the provided value
     *
     * @param value the value of the number
     * @returns the created object
     */
    newNumber(value: number): NumberObject {
        return new NumberObject(value, this.numberPrototype);
    }

    /**
     * Creates a new FullObject with the correct proto from the context
     *
     * @returns the created empty FullObject
     */
    newObject(): FullObject {
        const instance = new FullObject();
        instance.setLocalField(SemanticFieldNames.PROTO, { value: this.objectPrototype }, this);
        return instance;
    }

    /**
     * Gets a field on the global scope
     *
     * @param key identifier of the field
     * @returns the value of the field
     */
    getField(key: string | number): BaseObject {
        return this.globalScope.getField(key, this);
    }

    /**
     * Increases the step counter, and throws an error if the counter is bigger than the max allowed value
     */
    nextStep(): void {
        this.currentExecutionSteps++;
        if (this.currentExecutionSteps > this.maxExecutionSteps) {
            throw new RuntimeError("Max execution steps exceeded, possible infinite loop detected.");
        }
    }
}

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
        expressions: Expression[]
    ): InterpreterModule {
        return {
            name,
            dependencies,
            runtimeDependencies,
            expressions: toExecutable(expressions)
        };
    }
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
    constructor(modules: InterpreterModule[], private readonly maxExecutionSteps: number) {
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
            let lastRes: BaseObject = context.null;
            for (const expression of expressions) {
                lastRes = expression.evaluate(context).value;
            }
            return { result: lastRes, globalScope: context.currentScope };
        } catch (e: any) {
            if (Array.isArray(e.interpretationStack)) {
                return { error: e };
            } else {
                throw e;
            }
        }
    }
}
