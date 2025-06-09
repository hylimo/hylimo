import dedent from "dedent";
import type { Expression } from "../../ast/expression.js";
import type { Type } from "../../types/base.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { BaseObject } from "../objects/baseObject.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Documentation of a function
 */
export interface FunctionDocumentation {
    /**
     * The documentation of the function itself
     */
    docs: string;
    /**
     * Documentation and type of the parameters, consisting of
     * - the name of the parameter
     * - the documentation of the parameter
     * - the type of the parameter (optional)
     */
    params: (readonly [string | number, string, Type] | readonly [string | number, string])[];
    /**
     * Documentation of the return value
     */
    returns: string;
    /**
     * Optional snippet
     */
    snippet?: string;
}

/**
 * Executable AbstractFunctionExpression
 */
export abstract class ExecutableAbstractFunctionExpression<
    T extends Expression = Expression
> extends ExecutableExpression<T> {
    /**
     * Creates a new ExecutableAbstractFunctionExpression
     *
     * @param expression the expression this represents
     * @param documentation the documentation of the function
     */
    constructor(
        expression: T | undefined,
        readonly documentation: FunctionDocumentation | undefined
    ) {
        super(expression);
    }

    protected convertDocumentationToObject(context: InterpreterContext): BaseObject {
        if (this.documentation == undefined) {
            return context.null;
        }
        const result = context.newObject();
        result.setSelfLocalField("docs", { value: context.newString(dedent(this.documentation.docs)) }, context);
        result.setSelfLocalField("returns", { value: context.newString(this.documentation.returns) }, context);
        if (this.documentation.snippet !== undefined) {
            result.setSelfLocalField("snippet", { value: context.newString(this.documentation.snippet) }, context);
        }
        const params = context.newObject();
        for (const param of this.documentation.params) {
            params.setSelfLocalField(param[0], { value: context.newString(param[1]) }, context);
        }
        result.setSelfLocalField("params", { value: params }, context);
        return result;
    }
}
