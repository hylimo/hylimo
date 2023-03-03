/**
 * A configuration object which should be provided as a global config object before the diagram script is executed
 * These values can come from a graphical interface, cli parameters, ...
 */
export interface DiagramConfig {
    /**
     * The theme the diagram uses, by default light and dark are supported
     */
    theme: "light" | "dark" | string;
}
