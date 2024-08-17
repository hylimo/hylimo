import { InterpreterContext } from "../runtime/interpreter.js";
import { WrapperObject } from "../runtime/objects/wrapperObject.js";
import { Expression } from "./expression.js";
import { ExpressionMetadata } from "./expressionMetadata.js";
import { ListEntry } from "./listEntry.js";

/**
 * Object expression which creates a new object
 */
export class ObjectExpression extends Expression {
    static readonly TYPE = "ObjectExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...Expression.expressionWrapperObjectEntries<ObjectExpression>(ObjectExpression.TYPE),
        ["fields", (wrapped, context) => context.newListWrapperObject(wrapped.fields, ListEntry.toWrapperObject)]
    ]);

    /**
     * Creates a new ObjectExpression consisting of a set of fields
     *
     * @param fields the fields of the object
     * @param metadata metadata for the expression
     */
    constructor(
        readonly fields: ListEntry[],
        metadata: ExpressionMetadata
    ) {
        super(ObjectExpression.TYPE, metadata);
    }

    override markNoEditInternal(): void {
        super.markNoEditInternal();
        for (const field of this.fields) {
            field.value.markNoEdit();
        }
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, ObjectExpression.WRAPPER_ENTRIES);
    }
}
