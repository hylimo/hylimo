import { Expression } from "../../ast/expression";
import { Type } from "../../types/base";
import { InterpreterContext } from "../interpreter";
import { BaseObject } from "../objects/baseObject";
import { ExecutableExpression } from "./executableExpression";

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
    constructor(expression: T | undefined, readonly documentation: FunctionDocumentation | undefined) {
        super(expression);
    }

    protected convertDocumentationToObject(context: InterpreterContext): BaseObject {
        if (this.documentation == undefined) {
            return context.null;
        }
        const result = context.newObject();
        result.setLocalField("docs", { value: context.newString(this.documentation.docs) });
        result.setLocalField("returns", { value: context.newString(this.documentation.returns) });
        if (this.documentation.snippet !== undefined) {
            result.setLocalField("snippet", { value: context.newString(this.documentation.snippet) });
        }
        const params = context.newObject();
        for (const param of this.documentation.params) {
            params.setLocalField(param[0], { value: context.newString(param[1]) });
        }
        result.setLocalField("params", { value: params });
        return result;
    }
}
