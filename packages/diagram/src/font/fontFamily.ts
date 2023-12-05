import { Font } from "fontkit";
import { FontFamilyConfig } from "@hylimo/diagram-common";

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
    normal: Font;
    /**
     * The italic font
     */
    italic: Font;
    /**
     * The bold font
     */
    bold: Font;
    /**
     * The bold italic font
     */
    boldItalic: Font;
}
