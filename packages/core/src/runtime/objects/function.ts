import { Expression, FunctionExpression, InvocationArgument, NativeFunctionExpression } from "../../parser/ast";
import { Type } from "../../types/base";
import { InterpreterContext } from "../interpreter";
import { RuntimeError } from "../runtimeError";
import { SemanticFieldNames } from "../semanticFieldNames";
import { BaseObject, FieldEntry, SimpleObject } from "./baseObject";
import { FullObject } from "./fullObject";

/**
 * Base class for js functions and normal functions
 */
export abstract class AbstractFunctionObject extends SimpleObject {
    /**
     * Defines parentScope
     *
     * @param parentScope the parent scope, on exec a new scope with this as parent is created
     * @param proto the prototype of this object
     */
    constructor(readonly parentScope: FullObject, proto: FullObject) {
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
    args: InvocationArgument[],
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
        const typeCheckRes = type.matches(argValue, context);
        if (typeCheckRes !== true) {
            let reasonMessagePart: string;
            if (typeCheckRes.path.length > 0) {
                reasonMessagePart = `at .${typeCheckRes.path.join(".")}: ${typeCheckRes.reason}`;
            } else {
                reasonMessagePart = typeCheckRes.reason;
            }
            const message = `Invalid parameter ${key}: ${reasonMessagePart}`;
            let source: Expression | undefined = undefined;
            if (typeof key === "number" && args[key] && args[key].name === undefined) {
                source = args[key].value;
            } else if (typeof key === "string") {
                source = [...args].reverse().find((arg) => arg.name === key)?.value;
            }
            const error = new RuntimeError(message);
            if (source) {
                error.interpretationStack.push(source);
            }
            throw error;
        }
    }
    return argsObject;
}

/**
 * Function based on a DSL function
 */
export class FunctionObject extends AbstractFunctionObject {
    /**
     * Creates a new DSL function
     *
     * @param definition defines the function (what to execute)
     * @param parentScope the parent scope, on exec a new scope with this as parent is created
     * @param proto the prototype of this object
     */
    constructor(readonly definition: FunctionExpression, parentScope: FullObject, proto: FullObject) {
        super(parentScope, proto);
    }

    override invoke(args: InvocationArgument[], context: InterpreterContext, scope?: FullObject): FieldEntry {
        context.nextStep();
        const oldScope = context.currentScope;
        if (!scope) {
            scope = new FullObject();
            scope.setLocalField(SemanticFieldNames.PROTO, { value: this.parentScope }, context);
        }
        scope.setLocalField(SemanticFieldNames.THIS, { value: scope }, context);
        const generatedArgs = generateArgs(args, context, this.definition.types);
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
export class NativeFunctionObject extends AbstractFunctionObject {
    /**
     * Creates a new native js function
     *
     * @param definition defines the function (what to execute)
     * @param parentScope the parent scope, on exec a new scope with this as parent is created
     * @param proto the prototype of this object
     */
    constructor(readonly definition: NativeFunctionExpression, parentScope: FullObject, proto: FullObject) {
        super(parentScope, proto);
    }

    override invoke(args: InvocationArgument[], context: InterpreterContext): FieldEntry {
        context.nextStep();
        const res = this.definition.callback(args, context, this.parentScope);
        return res;
    }

    override toString(): string {
        return "{ native function }";
    }
}
