import { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression.js";
import { validate } from "../../types/validate.js";
import {
    ExecutableAbstractFunctionExpression,
    FunctionDocumentation
} from "../ast/executableAbstractFunctionExpression.js";
import { ExecutableListEntry } from "../ast/executableListEntry.js";
import { ExecutableFunctionExpression } from "../ast/executableFunctionExpression.js";
import { ExecutableNativeFunctionExpression } from "../ast/executableNativeFunctionExpression.js";
import { InterpreterContext } from "../interpreter.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import { BaseObject, FieldEntry, SimpleObject } from "./baseObject.js";
import { FullObject } from "./fullObject.js";

/**
 * Base class for js functions and normal functions
 */
export abstract class AbstractFunctionObject<T extends ExecutableAbstractFunctionExpression<any>> extends SimpleObject {
    /**
     * Defines parentScope
     *
     * @param parentScope the parent scope, on exec a new scope with this as parent is created
     * @param proto the prototype of this object
     * @param docs the documentation of this function
     */
    constructor(
        readonly definition: T,
        readonly parentScope: FullObject,
        proto: FullObject,
        public docs: BaseObject
    ) {
        super(proto);
    }

    override getFieldEntry(key: string | number, context: InterpreterContext): FieldEntry {
        if (key === SemanticFieldNames.DOCS) {
            return {
                value: this.docs
            };
        } else {
            return super.getFieldEntry(key, context);
        }
    }

    override getFieldEntries(): Record<string, FieldEntry> {
        const result = super.getFieldEntries();
        if (this.docs !== undefined) {
            result[SemanticFieldNames.DOCS] = {
                value: this.docs
            };
        }
        return result;
    }

    override setFieldEntry(key: string | number, value: FieldEntry, context: InterpreterContext): void {
        if (key === SemanticFieldNames.DOCS) {
            this.docs = value.value;
        } else {
            super.setFieldEntry(key, value, context);
        }
    }

    override setLocalField(key: string | number, value: FieldEntry) {
        if (key === SemanticFieldNames.DOCS) {
            this.docs = value.value;
        } else {
            super.setLocalField(key, value);
        }
    }

    override deleteField(key: string | number, context: InterpreterContext): void {
        if (key === SemanticFieldNames.DOCS) {
            this.docs = context.null;
        } else {
            super.deleteField(key, context);
        }
    }

    override toNative(): any {
        return null;
    }
}

/**
 * * Generates the arguments map based on argumentExpressions
 *
 * @param context context in which this is performed
 * @param args arguments to evaluate
 * @param types optional types for type checking
 * @returns the generated args
 * @throws RuntimeError when the provided arguments to not match provided types
 */
export function generateArgs(
    args: ExecutableListEntry[],
    context: InterpreterContext,
    documentation: FunctionDocumentation | undefined
): FullObject {
    const argsObject = context.newObject();
    let indexCounter = 0;
    for (const argumentExpression of args) {
        const value = argumentExpression.value.evaluateWithSource(context);
        argsObject.setLocalField(argumentExpression.name ?? indexCounter++, value);
    }
    for (const entry of documentation?.params ?? []) {
        const [key, description, type] = entry;
        if (type != undefined) {
            const argValue = argsObject.getLocalField(key, context).value;
            validate(type, `Invalid value for parameter ${key}: ${description}`, argValue, context, () => {
                if (typeof key === "number") {
                    const indexArguments = args.filter((arg) => arg.name == undefined);
                    if (indexArguments[key]) {
                        return indexArguments[key].value.expression;
                    }
                } else if (typeof key === "string") {
                    return [...args].reverse().find((arg) => arg.name === key)?.value?.expression;
                }
                return undefined;
            });
        }
    }
    return argsObject;
}

/**
 * Function based on a DSL function
 */
export class FunctionObject extends AbstractFunctionObject<ExecutableFunctionExpression> {
    /**
     * Creates a new DSL function
     *
     * @param definition defines the function (what to execute)
     * @param parentScope the parent scope, on exec a new scope with this as parent is created
     * @param proto the prototype of this object
     * @param docs the documentation of this function
     */
    constructor(
        definition: ExecutableFunctionExpression,
        parentScope: FullObject,
        proto: FullObject,
        docs: BaseObject
    ) {
        super(definition, parentScope, proto, docs);
    }

    override invoke(args: ExecutableListEntry[], context: InterpreterContext, scope?: FullObject): FieldEntry {
        context.nextStep();
        const oldScope = context.currentScope;
        if (!scope) {
            scope = new FullObject();
            scope.setLocalField(SemanticFieldNames.PROTO, { value: this.parentScope });
        }
        scope.setLocalField(SemanticFieldNames.THIS, { value: scope });
        const generatedArgs = generateArgs(args, context, this.definition.documentation);
        scope.setLocalField(SemanticFieldNames.ARGS, { value: generatedArgs });
        scope.setLocalField(SemanticFieldNames.IT, generatedArgs.getFieldEntry(0, context));
        context.currentScope = scope;
        let lastValue: BaseObject = context.null;
        for (const expression of this.definition.expressions) {
            lastValue = expression.evaluate(context).value;
        }
        context.currentScope = oldScope;
        return { value: lastValue };
    }

    override toString(): string {
        return "{ function }";
    }
}

/**
 * Function based on a native js function
 * Does NOT create a new scope on invoke, but provides the parent scope
 */
export class NativeFunctionObject extends AbstractFunctionObject<ExecutableNativeFunctionExpression> {
    /**
     * Creates a new native js function
     *
     * @param definition defines the function (what to execute)
     * @param parentScope the parent scope, on exec a new scope with this as parent is created
     * @param proto the prototype of this object
     * @param docs the documentation of this function
     */
    constructor(
        definition: ExecutableNativeFunctionExpression,
        parentScope: FullObject,
        proto: FullObject,
        docs: BaseObject
    ) {
        super(definition, parentScope, proto, docs);
    }

    override invoke(
        args: ExecutableListEntry[],
        context: InterpreterContext,
        _scope?: FullObject,
        callExpression?: AbstractInvocationExpression
    ): FieldEntry {
        context.nextStep();
        const res = this.definition.callback(args, context, this.parentScope, callExpression);
        return res;
    }

    override toString(): string {
        return "{ native function }";
    }
}
