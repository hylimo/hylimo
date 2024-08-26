import { ExpressionMetadata } from "./expressionMetadata.js";
import { Range } from "./range.js";
import { WrapperObject, WrapperObjectFieldRetriever } from "../runtime/objects/wrapperObject.js";
import { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";

/**
 * Base interface for all expressions
 */

export abstract class Expression<M extends ExpressionMetadata = ExpressionMetadata> {
    /**
     * Creates the common entries for subclass wrapper objects
     *
     * @param type the type of the subclass
     * @returns the common entries for the subclass wrapper object
     */
    static expressionWrapperObjectEntries<T extends Expression>(
        type: string
    ): [string | number, WrapperObjectFieldRetriever<T>][] {
        return [
            ["type", (_wrapped, context) => context.newString(type)],
            ["isEditable", (wrapped, context) => context.newBoolean(wrapped.metadata.isEditable)]
        ];
    }

    /**
     * Getter for the range from the metadata
     */
    get range(): Range {
        return this.metadata.range;
    }

    /**
     * Creates a new Expression
     *
     * @param type the type of the expression
     * @param metadata the metadata of the expression
     */
    constructor(
        readonly type: string,
        readonly metadata: M
    ) {}

    /**
     * Marks the expression as not editable
     * If the expression is already not editable, this method does nothing
     */
    markNoEdit(): void {
        if (this.metadata.isEditable) {
            this.markNoEditInternal();
        }
    }

    /**
     * Marks the expression as not editable
     * Should be overwritten to mark subexpressions as not editable
     */
    protected markNoEditInternal(): void {
        this.metadata.isEditable = false;
    }

    /**
     * Converts the expression to a wrapper object
     *
     * @param context the context in which the expression is evaluated
     * @returns the wrapper object representing the expression
     */
    abstract toWrapperObject(context: InterpreterContext): WrapperObject<any>;
}
