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
     * Defines parentScope
     *
     * @param parentScope the parent scope, on exec a new scope with this as parent is created
     * @param proto the prototype of this object
     * @param docs the documentation of this function
     */
    constructor(
        readonly definition: T,
        readonly parentScope: FullObject,
        public docs: BaseObject
    ) {
        super();
    }

    override getProto(context: InterpreterContext): FullObject {
        return context.functionPrototype;
    }

    override getField(key: string | number, context: InterpreterContext, self: BaseObject): LabeledValue {
        if (key === SemanticFieldNames.DOCS) {
            return {
                value: this.docs
            };
        } else {
            return super.getField(key, context, self);
        }
    }

    override getFields(context: InterpreterContext, self: BaseObject): Map<string | number, LabeledValue> {
        const result = super.getFields(context, self);
        if (this.docs !== undefined) {
            result.set(SemanticFieldNames.DOCS, {
                value: this.docs
            });
        }
        return result;
    }

    override setField(key: string | number, value: LabeledValue, context: InterpreterContext): void {
        if (key === SemanticFieldNames.DOCS) {
            this.docs = value.value;
        } else {
            super.setField(key, value, context, this);
        }
    }

    override setLocalField(key: string | number, value: LabeledValue, context: InterpreterContext) {
        if (key === SemanticFieldNames.DOCS) {
            this.docs = value.value;
        } else {
            super.setLocalField(key, value, context, this);
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
     * @param docs the documentation of this function
     */
    constructor(definition: ExecutableFunctionExpression, parentScope: FullObject, docs: BaseObject) {
        super(definition, parentScope, docs);
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
            scope = new FullObject();
            scope.setSelfLocalField(SemanticFieldNames.PROTO, { value: this.parentScope }, context);
        }
        scope.setSelfLocalField(SemanticFieldNames.THIS, { value: scope }, context);
        const generatedArgs = generateArgs(args, context, this.definition.documentation, callExpression);
        scope.setSelfLocalField(SemanticFieldNames.ARGS, { value: generatedArgs, source: callExpression }, context);
        scope.setSelfLocalField(SemanticFieldNames.IT, generatedArgs.getSelfField(0, context), context);
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
     * @param docs the documentation of this function
     */
    constructor(definition: ExecutableNativeFunctionExpression, parentScope: FullObject, docs: BaseObject) {
        super(definition, parentScope, docs);
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
