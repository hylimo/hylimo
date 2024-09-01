import { assertNumber } from "../../stdlib/typeHelpers.js";
import { numberType } from "../../types/number.js";
import { jsFun } from "../executableAstHelper.js";
import { BaseObject } from "../objects/baseObject.js";
import { BooleanObject } from "../objects/booleanObject.js";
import { FullObject } from "../objects/fullObject.js";
import { NullObject } from "../objects/nullObject.js";
import { NumberObject } from "../objects/numberObject.js";
import { StringObject } from "../objects/stringObject.js";
import { WrapperObjectFieldRetriever, WrapperObject } from "../objects/wrapperObject.js";
import { RuntimeError } from "../runtimeError.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";

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
     * Prototype for all boolean objects
     */
    readonly booleanPrototype: FullObject;
    /**
     * Prototype for all created DSL functions, including native functions
     */
    readonly functionPrototype: FullObject;
    /**
     * Prototype for all created wrapper objects
     */
    readonly wrapperPrototype: FullObject;
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
    constructor(
        readonly maxExecutionSteps: number,
        modules: string[]
    ) {
        this.null = new NullObject();
        this.objectPrototype = new FullObject();
        this.numberPrototype = this.newObject();
        this.stringPrototype = this.newObject();
        this.booleanPrototype = this.newObject();
        this.functionPrototype = this.newObject();
        this.wrapperPrototype = this.newObject();
        this.currentScope = this.newObject();
        this.currentScope.setField(SemanticFieldNames.THIS, { value: this.currentScope }, this);
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
     * Creates a new BooleanObject with the provided value
     *
     * @param value the value of the boolean
     * @returns the created object
     */
    newBoolean(value: boolean): BooleanObject {
        return new BooleanObject(value, this.booleanPrototype);
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
     * Creates a new WrapperObject with the provided wrapped object and entries
     *
     * @param wrapped the wrapped object
     * @param entries entries function which compute the value of the fields
     * @returns the created WrapperObject
     */
    newWrapperObject<T>(wrapped: T, entries: Map<string | number, WrapperObjectFieldRetriever<T>>): WrapperObject<T> {
        return new WrapperObject(wrapped, this.objectPrototype, entries);
    }

    /**
     * Creates a new WrapperObject for a list with the provided wrapped object and entries
     *
     * @param wrapped the wrapped objects
     * @param converter the converter to convert the wrapped object to a WrapperObject
     * @returns the created WrapperObject
     */
    newListWrapperObject<T>(wrapped: T[], converter: WrapperObjectFieldRetriever<T>): WrapperObject<T[]> {
        return this.newWrapperObject(
            wrapped,
            new Map<string | number, WrapperObjectFieldRetriever<T[]>>([
                ["length", (wrapped, context) => context.newNumber(wrapped.length)],
                [
                    "get",
                    (wrapped) => {
                        return this.createListWrapperGetterFunction<T>(converter, wrapped);
                    }
                ]
            ])
        );
    }

    /**
     * Creates the getter function for a list wrapper object
     *
     * @param converter the converter to convert the wrapped object to a WrapperObject
     * @param wrapped the wrapped objects
     * @returns the created getter function
     */
    private createListWrapperGetterFunction<T>(converter: WrapperObjectFieldRetriever<T>, wrapped: T[]): BaseObject {
        return jsFun(
            (args) => {
                const indexArg = args.getFieldValue(0, this);
                const index = assertNumber(indexArg, "0");
                return { value: converter(wrapped[index], this) };
            },
            {
                docs: "Gets the element at the specified index",
                params: [[0, "the index to access, must be a valid index (integer >= 0)", numberType]],
                returns: "the element at the specified index"
            }
        ).evaluate(this).value;
    }

    /**
     * Gets a field on the global scope
     *
     * @param key identifier of the field
     * @returns the value of the field
     */
    getGlobalField(key: string | number): BaseObject {
        return this.globalScope.getFieldValue(key, this);
    }

    /**
     * Gets a field on the current scope
     *
     * @param key identifier of the field
     * @returns the value of the field
     */
    getField(key: string | number): BaseObject {
        return this.currentScope.getFieldValue(key, this);
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
