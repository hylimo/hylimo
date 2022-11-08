import { Expression } from "../parser/ast";
import { FullObject } from "./objects/fullObject";
import { NullObject } from "./objects/null";
import { NumberObject } from "./objects/number";
import { StringObject } from "./objects/string";
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
    currentExecutionSteps: number = 0;
    /**
     * Current execution scope.
     * Code modifying this is responsible for recreating the correct scope afterwards.
     * No automatic management is performed.
     */
    currentScope: FullObject;

    /**
     * Creates a new DefaultInterpreterContext
     *
     * @param maxExecutionSteps The maximum amount of execution steps
     */
    constructor(readonly maxExecutionSteps: number) {
        this.null = new NullObject();
        this.objectPrototype = new FullObject();
        this.numberPrototype = this.newObject();
        this.stringPrototype = this.newObject();
        this.functionPrototype = this.newObject();
        this.nativeFunctionPrototype = this.newObject();
        this.currentScope = this.newObject();
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
        instance.setField(SemanticFieldNames.PROTO, { value: this.objectPrototype }, this);
        return instance;
    }
}

/**
 * Module which can be loaded into the interpreter.
 * Has a unique name and can specify dependencies
 * Dependencies have to be loaded before the module
 */
export interface InterpreterModule {
    name: string;
    dependencies: string[];
    expressions: Expression[];
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
     */
    constructor(modules: InterpreterModule[]) {
        const markedModules = modules.map((module) => ({ module, mark: false, temporaryMark: false }));
        const moduleLookup = new Map<string, typeof markedModules[0]>();
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
        module.temporaryMark = true;
        if (!module.mark) {
            for (const child of module.module.dependencies) {
                const childModule = moduleLookup.get(child);
                if (!childModule) {
                    throw new Error(`Unknown module dependency: ${child}`);
                }
                this.visit(childModule, moduleLookup);
            }
        }
        module.temporaryMark = false;
        module.mark = true;
        this.modules.push(module.module);
    }

    /**
     * Evalutes a list of expressions with all modules loaded
     *
     * @param expressions the expressions to evaluate
     * @param maxExecutionSteps the max amount of execution steps to prevent infinite loops
     * @returns
     */
    run(expressions: Expression[], maxExecutionSteps: number): FullObject {
        const context = new InterpreterContext(maxExecutionSteps);
        for (const module of this.modules) {
            for (const expression of module.expressions) {
                expression.evaluate(context);
            }
        }
        for (const expression of expressions) {
            expression.evaluate(context);
        }
        return context.currentScope;
    }
}
