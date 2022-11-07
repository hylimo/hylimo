import { FunctionExpression, NativeFunctionExpression } from "../../parser/ast";
import { SimpleObject } from "./baseObject";
import { FullObject } from "./fullObject";

/**
 * Base class for js functions and normal functions
 */
export abstract class AbstractFunction extends SimpleObject {}

/**
 * Function based on a DSL function
 */
export class Function extends AbstractFunction {
    /**
     * Creates a new DSL function
     *
     * @param definition defines the function (what to execute)
     * @param parentScope the parent scope, on exec a new scope with this as parent is created
     * @param proto the prototype of this object
     */
    constructor(readonly definition: FunctionExpression, readonly parentScope: FullObject, proto: FullObject) {
        super(proto);
    }
}

/**
 * Function based on a native js function
 */
export class NativeFunction extends AbstractFunction {
    /**
     * Creates a new native js function
     *
     * @param definition defines the function (what to execute)
     * @param proto the prototype of this object
     */
    constructor(readonly definition: NativeFunctionExpression, proto: FullObject) {
        super(proto);
    }
}
