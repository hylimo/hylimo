import type { Element } from "../base/element.js";

/**
 * Shared interface for CanvasElements and CanvasConnections
 */
export interface EditableCanvasContent extends Element {
    /**
     * An expression which can be used by edits to obtain this element in an edit
     */
    editExpression?: string;
}
