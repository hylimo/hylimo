import { FontFamilyConfig, FontConfig } from "@hylimo/diagram-common";
import { Font, create } from "fontkit";
import axios from "axios";
import { FontFamily } from "./fontFamily.js";

/**
 * Handles retrieving fonts from an url
 */
export class FontManager {
    /**
     * Cache used to store download results based on the url
     */
    private readonly fetchCache = new Map<string, Font>();

    /**
     * Cache used to cache the actual fonts based on the stringified config
     */
    private readonly fontCache = new Map<string, Font>();

    /**
     * Cache for font families
     */
    private readonly fontFamilyCache = new Map<string, FontFamily>();

    /**
     * Gets a font family, caches results if possible
     *
     * @param config the config of the font family
     * @returns the created font family, and a boolean indicating if the font family was cached
     */
    async getFontFamily(config: FontFamilyConfig): Promise<{ fontFamily: FontFamily; cacheHit: boolean }> {
        const fontFamily = {
            config,
            normal: await this.getFont(config.normal),
            italic: await this.getFont(config.italic),
            bold: await this.getFont(config.bold),
            boldItalic: await this.getFont(config.boldItalic)
        };
        const cachedFontFamily = this.fontFamilyCache.get(config.fontFamily);
        let cacheHit = false;
        if (cachedFontFamily != undefined) {
            if (
                cachedFontFamily.normal === fontFamily.normal &&
                cachedFontFamily.italic === fontFamily.italic &&
                cachedFontFamily.bold === fontFamily.bold &&
                cachedFontFamily.boldItalic === fontFamily.boldItalic
            ) {
                cacheHit = true;
            }
        }
        this.fontFamilyCache.set(config.fontFamily, fontFamily);
        return { fontFamily, cacheHit };
    }

    /**
     * Gets a font, uses the caches to provent unnecessary fetches
     *
     * @param config config necessary for collection font types and variation font types
     * @returns the font
     */
    private async getFont(config: FontConfig): Promise<Font> {
        const cacheKey = JSON.stringify(config);
        if (this.fontCache.has(cacheKey)) {
            return this.fontCache.get(cacheKey)!;
        }
        let fetchResult = this.fetchCache.get(config.url);
        if (!fetchResult) {
            let buffer = await (await axios.get(config.url, { responseType: "arraybuffer" })).data;
            // workaround as axios returns Buffer on nodejs and ArrayBuffer on browser
            buffer = buffer.buffer ?? buffer;
            // workaround as restructure still wants a Buffer and not an ArrayBuffer
            buffer.buffer = buffer;
            fetchResult = create(buffer) as Font;
            this.fetchCache.set(config.url, fetchResult);
        }
        if (config.name) {
            fetchResult = (fetchResult as any).getFont(config.name);
        }
        if (config.variationSettings) {
            fetchResult = (fetchResult as any).getVariation(config.variationSettings);
        }
        this.fontCache.set(cacheKey, fetchResult!);
        return fetchResult!;
    }
}
