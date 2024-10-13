import { FontFamilyConfig, FontConfig } from "@hylimo/diagram-common";
import { Font, create } from "fontkit";
import { FontFamily, SubsettedFont } from "./fontFamily.js";
import { Buffer } from "buffer";
import { SubsetConfig } from "./subsetCollector.js";
import { LayoutCache } from "../engine/layoutCache.js";
import { subsetFont } from "./subsetFont.js";

/**
 * Handles retrieving fonts from an url
 */
export class FontManager {
    /**
     * Id counter for fetched buffers
     */
    private fetchIdCounter = 0;

    /**
     * Id counter for subsetted fonts
     */
    private fontIdCounter = 0;

    /**
     * Cache used to store download results based on the url
     */
    private readonly fetchCache = new Map<string, { font: Buffer; id: number }>();

    /**
     * Cache for font families
     */
    private readonly fontFamilyCache = new Map<string, FontFamily>();

    /**
     * Creates a new font manager
     *
     * @param subsetFontCache cache for subsetted fonts
     */
    constructor(private readonly subsetFontCache: LayoutCache<SubsetFontKey, Promise<SubsettedFont>>) {}

    /**
     * Gets a font family, caches results if possible
     *
     * @param config the config of the font family
     * @returns the created font family, and a boolean indicating if the font family was cached
     */
    async getFontFamily(
        config: FontFamilyConfig,
        subsetConfig: SubsetConfig
    ): Promise<{ fontFamily: FontFamily; cacheHit: boolean }> {
        const fontFamily = {
            config,
            normal: await this.getFont(config.normal, subsetConfig.normal),
            italic: await this.getFont(config.italic, subsetConfig.italic),
            bold: await this.getFont(config.bold, subsetConfig.bold),
            boldItalic: await this.getFont(config.boldItalic, subsetConfig.boldItalic)
        };
        const cachedFontFamily = this.fontFamilyCache.get(config.fontFamily);
        let cacheHit = false;
        if (cachedFontFamily != undefined) {
            if (
                cachedFontFamily.normal?.originalFont === fontFamily.normal?.originalFont &&
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
     * @param subset the subset to use
     * @returns the font
     */
    private async getFont(config: FontConfig, subset: string | undefined): Promise<SubsettedFont | undefined> {
        if (subset == undefined) {
            return undefined;
        }
        let fetchResult = this.fetchCache.get(config.url);
        if (!fetchResult) {
            const buffer = Buffer.from(await (await fetch(config.url)).arrayBuffer());
            fetchResult = { font: buffer, id: this.fetchIdCounter++ };
            this.fetchCache.set(config.url, fetchResult);
        }

        return this.subsetFontCache.getOrCompute(
            { variationSettings: config.variationSettings, id: fetchResult.id },
            async () => {
                const subsettedFont = await subsetFont(fetchResult.font, subset, config.variationSettings);
                return {
                    id: `custom_${this.fontIdCounter++}`,
                    font: create(subsettedFont) as Font,
                    subsettedFontEncoded: subsettedFont.toString("base64"),
                    originalFont: fetchResult.font
                };
            }
        );
    }
}

/**
 * Key used to store subsetted fonts in the cache
 */
export interface SubsetFontKey extends Omit<FontConfig, "url"> {
    /**
     * The id of the fetched buffer
     */
    id: number;
}
