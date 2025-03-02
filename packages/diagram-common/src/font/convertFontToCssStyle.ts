import type { FontData } from "./fontData.js";

/**
 * Converts a list of fonts to a css style string
 *
 * @param fonts the fonts to convert
 * @returns the css style string
 */
export function convertFontsToCssStyle(fonts: FontData[]): string {
    return fonts
        .map((font) => {
            return `@font-face {
                font-family: ${font.fontFamily};
                src: url(data:font/ttf;base64,${font.data});
            }`;
        })
        .join("\n");
}
