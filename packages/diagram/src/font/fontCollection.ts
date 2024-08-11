import { FontStyle, FontWeight } from "@hylimo/diagram-common";
import { Font } from "fontkit";
import { FontFamily } from "./fontFamily.js";

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
     *
     * @param fontFamilies the font families
     */
    constructor(fontFamilies: FontFamily[]) {
        for (const fontFamily of fontFamilies) {
            this.fontFamilies.set(fontFamily.config.fontFamily, fontFamily);
        }
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
    getFont(family: string, weight: FontWeight, style: FontStyle): Font {
        const fontFamily = this.fontFamilies.get(family);
        if (!fontFamily) {
            throw new Error(`Font family ${family} not found`);
        }
        switch (style) {
            case FontStyle.Normal:
                return weight === FontWeight.Bold ? fontFamily.bold : fontFamily.normal;
            case FontStyle.Italic:
                return weight === FontWeight.Bold ? fontFamily.boldItalic : fontFamily.italic;
            default:
                throw new Error(`Unknown font style ${style}`);
        }
    }
}
