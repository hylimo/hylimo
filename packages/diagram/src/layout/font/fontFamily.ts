import type { Font } from "fontkit";
import type { FontFamilyConfig } from "@hylimo/diagram-common";
import type { Buffer } from "buffer/";

/**
 * Defines a font family to be used
 */
export interface FontFamily {
    /**
     * The config used to create the font family
     */
    config: FontFamilyConfig;
    /**
     * The normal font
     */
    normal?: SubsettedFont;
    /**
     * The italic font
     */
    italic?: SubsettedFont;
    /**
     * The bold font
     */
    bold?: SubsettedFont;
    /**
     * The bold italic font
     */
    boldItalic?: SubsettedFont;
}

/**
 * A subsetted font
 */
export interface SubsettedFont {
    /**
     * The "font family" (actually a unique id) of this font
     */
    id: string;
    /**
     * The subsetted fontkit font
     */
    font: Font;
    /**
     * The subsetted font as base64 encoded string
     */
    subsettedFontEncoded: string;
    /**
     * The original buffer of the font
     */
    originalFont: Buffer;
}
