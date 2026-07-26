import type { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression.js";
import type { ExecutableAbstractFunctionExpression } from "../ast/executableAbstractFunctionExpression.js";
import type { ExecutableListEntry } from "../ast/executableListEntry.js";
import type { ExecutableFunctionExpression } from "../ast/executableFunctionExpression.js";
import type { ExecutableNativeFunctionExpression } from "../ast/executableNativeFunctionExpression.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import type { BaseObject } from "./baseObject.js";
import { SimpleObject } from "./baseObject.js";
import type { LabeledValue } from "./labeledValue.js";
import { FullObject } from "./fullObject.js";
import type { OperatorExpression } from "../../ast/operatorExpression.js";
import { generateArgs } from "./generateArgs.js";

/**
 * Base class for js functions and normal functions
 */
export abstract class AbstractFunctionObject<T extends ExecutableAbstractFunctionExpression<any>> extends SimpleObject {
    /**
     * The documentation of this function, materialized lazily on first access.
     * undefined means it has not been built yet.
     */
    private lazyDocs?: BaseObject;

    /**
     * Defines parentScope
     *
     * @param parentScope the parent scope, on exec a new scope with this as parent is created
     * @param proto the prototype of this object
     * @param creationContext the context this function was created in, used to lazily build the documentation
     */
    constructor(
        readonly definition: T,
        readonly parentScope: FullObject,
        private readonly creationContext: InterpreterContext
    ) {
        super();
    }

    /**
     * The documentation of this function.
     * Building the documentation object is comparatively expensive and almost never needed while
     * rendering, so it is deferred until the first access.
     */
    get docs(): BaseObject {
        return (this.lazyDocs ??= this.definition.convertDocumentationToObject(this.creationContext));
    }

    set docs(value: BaseObject) {
        this.lazyDocs = value;
    }

    override getProto(context: InterpreterContext): FullObject {
        return context.functionPrototype;
    }

    override getField(key: string | number, context: InterpreterContext): LabeledValue {
        if (key === SemanticFieldNames.DOCS) {
            return {
                value: this.docs,
                source: undefined
            };
        } else {
            return super.getField(key, context);
        }
    }

    override getFields(context: InterpreterContext): Map<string | number, LabeledValue> {
        const result = super.getFields(context);
        if (this.docs !== undefined) {
            result.set(SemanticFieldNames.DOCS, {
                value: this.docs,
                source: undefined
            });
        }
        return result;
    }

    override setField(key: string | number, value: LabeledValue, context: InterpreterContext): void {
        if (key === SemanticFieldNames.DOCS) {
            this.docs = value.value;
        } else {
            super.setField(key, value, context);
        }
    }

    override setLocalField(key: string | number, value: LabeledValue, context: InterpreterContext) {
        if (key === SemanticFieldNames.DOCS) {
            this.docs = value.value;
        } else {
            super.setLocalField(key, value, context);
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

    override equals(other: BaseObject): boolean {
        return other === this;
    }
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
     * @param context the context this function was created in, used to lazily build the documentation
     */
    constructor(definition: ExecutableFunctionExpression, parentScope: FullObject, context: InterpreterContext) {
        super(definition, parentScope, context);
    }

    override invoke(
        args: ExecutableListEntry[],
        context: InterpreterContext,
        scope: FullObject | undefined,
        callExpression: AbstractInvocationExpression | OperatorExpression | undefined
    ): LabeledValue {
        context.nextStep();
        const oldScope = context.currentScope;
        if (scope == undefined) {
            scope = new FullObject(this.parentScope);
        }
        scope.setLocalFieldDirect(SemanticFieldNames.THIS, { value: scope, source: undefined });
        const generatedArgs = generateArgs(args, context, this.definition.documentation, callExpression);
        scope.setLocalFieldDirect(SemanticFieldNames.ARGS, { value: generatedArgs, source: callExpression });
        scope.setLocalFieldDirect(SemanticFieldNames.IT, generatedArgs.getField(0, context));
        context.currentScope = scope;
        let lastValue: BaseObject = context.null;
        for (const expression of this.definition.expressions) {
            lastValue = expression.evaluate(context).value;
        }
        context.currentScope = oldScope;
        return { value: lastValue, source: undefined };
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
     * @param context the context this function was created in, used to lazily build the documentation
     */
    constructor(definition: ExecutableNativeFunctionExpression, parentScope: FullObject, context: InterpreterContext) {
        super(definition, parentScope, context);
    }

    override invoke(
        args: ExecutableListEntry[],
        context: InterpreterContext,
        _scope: FullObject,
        callExpression: AbstractInvocationExpression | OperatorExpression | undefined
    ): LabeledValue {
        context.nextStep();
        const res = this.definition.callback(args, context, this.parentScope, callExpression);
        return res;
    }

    override toString(): string {
        return "{ native function }";
    }
}
