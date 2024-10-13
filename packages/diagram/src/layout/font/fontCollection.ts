import { FontStyle, FontWeight } from "@hylimo/diagram-common";
import { FontFamily, SubsettedFont } from "./fontFamily.js";

/**
 * Collection of fonts
 */
export class FontCollection {
    /**
     * The font families by name
     */
    readonly fontFamilies = new Map<string, FontFamily>();

    /**
     * Creates a new font collection
     */
    constructor() {}

    /**
     * Registers a font family in this collection.
     *
     * @param family the font family
     */
    registerFont(family: FontFamily): void {
        this.fontFamilies.set(family.config.fontFamily, family);
    }

    /**
     * Gets a font from this collection.
     * If the font is not found, an error is thrown.
     *
     * @param family the font family
     * @param weight the font weight
     * @param style the font style
     * @returns the font
     */
    getFont(family: string, weight: FontWeight, style: FontStyle): SubsettedFont {
        const fontFamily = this.fontFamilies.get(family);
        if (!fontFamily) {
            throw new Error(`Font family ${family} not found`);
        }
        let subsettedFont: SubsettedFont | undefined;
        if (style === FontStyle.Normal) {
            subsettedFont = weight === FontWeight.Normal ? fontFamily.normal : fontFamily.bold;
        } else {
            subsettedFont = weight === FontWeight.Normal ? fontFamily.italic : fontFamily.boldItalic;
        }
        if (!subsettedFont) {
            throw new Error(`Font family ${family} does not have the requested font`);
        }
        return subsettedFont;
    }
}
