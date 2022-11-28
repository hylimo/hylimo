import { Font } from "fontkit";
import { FontFamilyConfig } from "./fontConfig";

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
     * If defined, the italic font
     */
    italic?: Font;
    /**
     * If defined, the bold font
     */
    bold?: Font;
    /**
     * If defined, the bold italic font
     */
    boldItalic?: Font;
}
