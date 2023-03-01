import { AbstractFunctionExpression } from "../../ast/ast";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable AbstractFunctionExpression
 */
export abstract class ExecutableAbstractFunctionExpression<
    T extends AbstractFunctionExpression
> extends ExecutableExpression<T> {}
