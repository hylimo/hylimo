/**
 * Well known field names which (usually) have a semantic meaning
 */
export enum SemanticFieldNames {
    /**
     * Prototype, should always be a table
     */
    PROTO = "proto",
    /**
     * Current scope
     */
    THIS = "this",
    /**
     * Self parameter providing the target to functions
     */
    SELF = "self",
    /**
     * Arguments passed to a function
     */
    ARGS = "args"
}
