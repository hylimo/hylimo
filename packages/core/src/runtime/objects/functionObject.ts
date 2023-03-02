import { AbstractInvocationExpression } from "../../ast/ast";
import { Type } from "../../types/base";
import { validate } from "../../types/validate";
import { ExecutableAbstractFunctionExpression } from "../ast/executableAbstractFunctionExpression";
import { ExecutableInvocationArgument } from "../ast/executableAbstractInvocationExpression";
import { ExecutableFunctionExpression } from "../ast/executableFunctionExpression";
import { ExecutableNativeFunctionExpression } from "../ast/executableNativeFunctionExpression";
import { InterpreterContext } from "../interpreter";
import { SemanticFieldNames } from "../semanticFieldNames";
import { BaseObject, FieldEntry, SimpleObject } from "./baseObject";
import { FullObject } from "./fullObject";

/**
 * Base class for js functions and normal functions
 */
export abstract class AbstractFunctionObject<T extends ExecutableAbstractFunctionExpression<any>> extends SimpleObject {
    /**
     * Defines parentScope
     *
     * @param parentScope the parent scope, on exec a new scope with this as parent is created
     * @param proto the prototype of this object
     */
    constructor(readonly definition: T, readonly parentScope: FullObject, proto: FullObject) {
        super(proto);
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
    args: ExecutableInvocationArgument[],
    context: InterpreterContext,
    types?: Map<string | number, Type>
): FullObject {
    const argsObject = context.newObject();
    let indexCounter = 0;
    for (const argumentExpression of args) {
        const value = argumentExpression.value.evaluateWithSource(context);
        argsObject.setLocalField(argumentExpression.name ?? indexCounter++, value, context);
    }
    for (const [key, type] of types?.entries() ?? []) {
        const argValue = argsObject.getLocalField(key, context).value;
        validate(type, `Invalid value for parameter ${key}`, argValue, context, () => {
            if (typeof key === "number" && args[key] && args[key].name === undefined) {
                return args[key].value.expression;
            } else if (typeof key === "string") {
                return [...args].reverse().find((arg) => arg.name === key)?.value?.expression;
            }
            return undefined;
        });
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
     */
    constructor(definition: ExecutableFunctionExpression, parentScope: FullObject, proto: FullObject) {
        super(definition, parentScope, proto);
    }

    override invoke(args: ExecutableInvocationArgument[], context: InterpreterContext, scope?: FullObject): FieldEntry {
        context.nextStep();
        const oldScope = context.currentScope;
        if (!scope) {
            scope = new FullObject();
            scope.setLocalField(SemanticFieldNames.PROTO, { value: this.parentScope }, context);
        }
        scope.setLocalField(SemanticFieldNames.THIS, { value: scope }, context);
        const generatedArgs = generateArgs(args, context, this.definition.expression.types);
        scope.setLocalField(SemanticFieldNames.ARGS, { value: generatedArgs }, context);
        scope.setLocalField(SemanticFieldNames.IT, generatedArgs.getFieldEntry(0, context), context);
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
     */
    constructor(definition: ExecutableNativeFunctionExpression, parentScope: FullObject, proto: FullObject) {
        super(definition, parentScope, proto);
    }

    override invoke(
        args: ExecutableInvocationArgument[],
        context: InterpreterContext,
        _scope?: FullObject,
        callExpression?: AbstractInvocationExpression
    ): FieldEntry {
        context.nextStep();
        const res = this.definition.expression.callback(args, context, this.parentScope, callExpression);
        return res;
    }

    override toString(): string {
        return "{ native function }";
    }
}
