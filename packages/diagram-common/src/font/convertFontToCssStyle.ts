import { FontConfig, FontFamilyConfig } from "./fontConfig";

/**
 * Converts a list of fonts to a css style string
 *
 * @param fonts the fonts to convert
 * @returns the css style string
 */
export function convertFontsToCssStyle(fonts: FontFamilyConfig[]): string {
    return fonts
        .flatMap((font) => [
            generateFontFace(font.fontFamily, font.normal, false, false),
            generateFontFace(font.fontFamily, font.italic, true, false),
            generateFontFace(font.fontFamily, font.bold, false, true),
            generateFontFace(font.fontFamily, font.boldItalic, true, true)
        ])
        .join("\n");
}

/**
 * Transforms a FontConfig to a font-face rule string
 *
 * @param fontFamily the name of the font
 * @param config config for the font to transform
 * @param italic if true, it is italic, otherwise normal
 * @param bold if true, it is bold, otherwise normal
 * @returns the font-face string
 */
function generateFontFace(fontFamily: string, config: FontConfig, italic: boolean, bold: boolean): string {
    const url = config.name ? `${config.url}#${config.name}` : config.url;
    const variationSettings = config.variationSettings ? generateVariationSettings(config.variationSettings) : "";
    return `@font-face {
        font-family: ${fontFamily};
        src: url(${url});
        font-weight: ${bold ? "bold" : "normal"};
        font-style: ${italic ? "italic" : "normal"};
        ${variationSettings}
    }
    `;
}

/**
 * Transforms a varation settings object or string to a string
 *
 * @param settings the font variation settings
 * @returns the variation settings string
 */
function generateVariationSettings(settings: any): string {
    if (typeof settings === "string") {
        return settings;
    } else {
        return Object.keys(settings)
            .map((key) => `"${key}" ${settings[key]}`)
            .join(", ");
    }
}
