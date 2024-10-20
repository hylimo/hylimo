/**
 * Defines a font family
 * Can contain multiple styles, always defines a normal style (neither italics nor bold)
 */
export interface FontFamilyConfig {
    /**
     * The name which is used for the font
     */
    fontFamily: string;
    /**
     * The normal font style, always used as fallback
     */
    normal: FontConfig;
    /**
     * Italic font style, if not present, normal is used
     */
    italic: FontConfig;
    /**
     * Bold font style, if not present, normal is used
     */
    bold: FontConfig;
    /**
     * Bold italic font style, if not present, italic is used
     */
    boldItalic: FontConfig;
}

/**
 * A font style which can be used
 */
export interface FontConfig {
    /**
     * Url from which to download the font file
     */
    url: string;
    /**
     * If a variation font file is used the values to use for varition axis
     */
    variationSettings?: { [axis: string]: number };
}
