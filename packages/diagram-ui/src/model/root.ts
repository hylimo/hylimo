import { FontConfig, FontFamilyConfig } from "@hylimo/diagram";
import { ModelIndexImpl, SGraphIndex, ViewportRootElement } from "sprotty";

/**
 * Root element.
 */
export class SRoot extends ViewportRootElement {
    /**
     * Defined font families
     */
    fonts!: FontFamilyConfig[];

    constructor(index = new ModelIndexImpl()) {
        super(index);
    }

    /**
     * Genrates the style string based on the fonts
     *
     * @returns the generated style string
     */
    generateStyle(): string {
        return this.fonts
            .flatMap((font) => [
                this.generateFontFace(font.fontFamily, font.normal, false, false),
                this.generateFontFace(font.fontFamily, font.italic, true, false),
                this.generateFontFace(font.fontFamily, font.bold, false, true),
                this.generateFontFace(font.fontFamily, font.boldItalic, true, true)
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
    private generateFontFace(fontFamily: string, config: FontConfig, italic: boolean, bold: boolean): string {
        const url = config.name ? `${config.url}#${config.name}` : config.url;
        const variationSettings = config.variationSettings
            ? this.generateVariationSettings(config.variationSettings)
            : "";
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
    private generateVariationSettings(settings: any): string {
        if (typeof settings === "string") {
            return settings;
        } else {
            return Object.keys(settings)
                .map((key) => `"${key}" ${settings[key]}`)
                .join(", ");
        }
    }
}
