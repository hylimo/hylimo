import { ASTExpressionPosition } from "../ast/astExpressionPosition";

/**
 * An autocompletion item
 */
export interface AutocompletionItem {
    /**
     * The value to insert when this item is selected
     */
    value: string;
    /**
     * The label to display in the autocompletion list
     */
    label: string;
    /**
     * The description to display in the autocompletion list
     */
    documentation: string;
    /**
     * The range to replace when this item is selected
     */
    replaceRange: ASTExpressionPosition;
    /**
     * The kind of this item
     */
    kind: AutocompletionItemKind;
}

/**
 * Autocompletion item kinds.
 */
export enum AutocompletionItemKind {
    /**
     * A field on an object
     */
    FIELD = "field",
    /**
     * A method on an object
     */
    METHOD = "method",
    /**
     * A variable
     */
    VARIABLE = "variable",
    /**
     * A function
     */
    FUNCTION = "function",
    /**
     * Any text not covered by the other types
     */
    TEXT = "text"
}
