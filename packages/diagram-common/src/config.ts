/**
 * A configuration object which should be provided as a global config object before the diagram script is executed
 * These values can come from a graphical interface, cli parameters, ...
 */
export interface DiagramConfig {
    /**
     * The theme the diagram uses, by default light and dark are supported
     */
    theme: "light" | "dark" | string;
    /**
     * The primary color of the diagram
     * Should be a hex color string
     */
    primaryColor: string;
    /**
     * The background color of the diagram
     * Should be a hex color string
     */
    backgroundColor: string;
    /**
     * Whether to enable font subsetting
     * If disabled, fonts are still subsetted e.g. to remove variation axes, however
     * all glyphs are included in the subset.
     */
    enableFontSubsetting: boolean;
    /**
     * Whether to enable external fonts
     * If disabled, only fonts with data urls are used, other fonts cause an error
     */
    enableExternalFonts: boolean;
}
