import { FontFamily } from "./font";
import { FontFamilyConfig, FontConfig } from "./fontConfig";
import { Font, create } from "fontkit";
import axios from "axios";

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
     * Gets a font family, caches results if possible
     * 
     * @param config the config of the font family
     * @returns the created font family
     */
    async getFontFamily(config: FontFamilyConfig): Promise<FontFamily> {
        const res: FontFamily = {
            config,
            normal: await this.getFont(config.normal)
        };
        if (config.bold) {
            res.bold = await this.getFont(config.bold);
        }
        if (config.italic) {
            res.italic = await this.getFont(config.italic);
        }
        if (config.boldItalic) {
            res.boldItalic = await this.getFont(config.boldItalic);
        }
        return res;
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
        if (fetchResult) {
            const buffer = await (await axios.get(config.url, { responseType: "arraybuffer" })).data;
            fetchResult = create(buffer);
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