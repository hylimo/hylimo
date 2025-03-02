import type { WrapperObject } from "../runtime/objects/wrapperObject.js";
import { Expression } from "./expression.js";

export class NoopExpression extends Expression {
    static readonly TYPE = "NoopExpression";

    constructor() {
        super(NoopExpression.TYPE, { range: [-1, -1], isEditable: false });
    }

    override toWrapperObject(): WrapperObject<any> {
        throw new Error("This expression should never reach runtime.");
    }
}
