import { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression.js";
import { ExecutableAbstractFunctionExpression } from "../ast/executableAbstractFunctionExpression.js";
import { ExecutableListEntry } from "../ast/executableListEntry.js";
import { ExecutableFunctionExpression } from "../ast/executableFunctionExpression.js";
import { ExecutableNativeFunctionExpression } from "../ast/executableNativeFunctionExpression.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import { BaseObject, SimpleObject } from "./baseObject.js";
import { LabeledValue } from "./labeledValue.js";
import { FullObject } from "./fullObject.js";
import { OperatorExpression } from "../../ast/operatorExpression.js";
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
        proto: FullObject,
        public docs: BaseObject
    ) {
        super(proto);
    }

    override getField(key: string | number, context: InterpreterContext): LabeledValue {
        if (key === SemanticFieldNames.DOCS) {
            return {
                value: this.docs
            };
        } else {
            return super.getField(key, context);
        }
    }

    override getFields(context: InterpreterContext): Map<string | number, LabeledValue> {
        const result = super.getFields(context);
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

    override invoke(
        args: ExecutableListEntry[],
        context: InterpreterContext,
        scope?: FullObject,
        callExpression?: AbstractInvocationExpression | OperatorExpression
    ): LabeledValue {
        context.nextStep();
        const oldScope = context.currentScope;
        if (!scope) {
            scope = new FullObject();
            scope.setLocalField(SemanticFieldNames.PROTO, { value: this.parentScope }, context);
        }
        scope.setLocalField(SemanticFieldNames.THIS, { value: scope }, context);
        const generatedArgs = generateArgs(args, context, this.definition.documentation, callExpression);
        scope.setLocalField(SemanticFieldNames.ARGS, { value: generatedArgs, source: callExpression }, context);
        scope.setLocalField(SemanticFieldNames.IT, generatedArgs.getField(0, context), context);
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
        callExpression?: AbstractInvocationExpression | OperatorExpression
    ): LabeledValue {
        context.nextStep();
        const res = this.definition.callback(args, context, this.parentScope, callExpression);
        return res;
    }

    override toString(): string {
        return "{ native function }";
    }
}
