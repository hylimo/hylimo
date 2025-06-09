import { assertFunction } from "../../stdlib/typeHelpers.js";
import { ExecutableConstExpression } from "../ast/executableConstExpression.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { BaseObject } from "./baseObject.js";
import type { LabeledValue } from "./labeledValue.js";
import type { AbstractFunctionObject } from "./functionObject.js";

/**
 * Property consisting of a getter and a setter
 */
export class Property {
    /**
     * Creates a property consisting of a getter and a setter
     *
     * @param getter the getter function
     * @param setter the setter function
     */
    constructor(
        private readonly getter: AbstractFunctionObject<any>,
        private readonly setter: AbstractFunctionObject<any>
    ) {
        assertFunction(getter, "getter");
        assertFunction(setter, "setter");
    }

    /**
     * Invokes the getter function with the provided self object
     *
     * @param self the object to get the property from
     * @param context the context in which this is performed
     * @returns the value of the property
     */
    get(self: BaseObject, context: InterpreterContext): LabeledValue {
        return this.getter.invoke(
            [{ value: new ExecutableConstExpression({ value: self }), name: "self" }],
            context,
            undefined,
            undefined
        );
    }

    /**
     * Invokes the setter function with the provided self object and value
     *
     * @param self the object to set the property on
     * @param value the new value of the property
     * @param context the context in which this is performed
     * @returns the new value of the property
     */
    set(self: BaseObject, value: LabeledValue, context: InterpreterContext): LabeledValue {
        return this.setter.invoke(
            [
                { value: new ExecutableConstExpression({ value: self }), name: "self" },
                { value: new ExecutableConstExpression(value) }
            ],
            context,
            undefined,
            undefined
        );
    }
}
