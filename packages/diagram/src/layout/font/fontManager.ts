import { FontFamilyConfig, FontConfig, DiagramConfig } from "@hylimo/diagram-common";
import { FontFamily, SubsettedFont } from "./fontFamily.js";
import { Buffer } from "buffer/index.js";
import { SubsetConfig } from "./subsetCollector.js";
import { LayoutCache } from "../engine/layoutCache.js";
import { SubsetManager } from "./subsetFont.js";
import { v4 as uuid } from "uuid";
import { createFont } from "./createFont.js";

/**
 * Handles retrieving fonts from an url
 */
export class FontManager {
    /**
     * Id counter for fetched buffers
     */
    private fetchIdCounter = 0;

    /**
     * Cache used to store download results based on the url
     */
    private readonly fetchCache = new Map<string, { font: Buffer; id: number }>();

    /**
     * Cache for font families
     */
    private readonly fontFamilyCache = new Map<string, FontFamily>();

    /**
     * Handles font subsetting
     */
    private readonly subsetManager = new SubsetManager();

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
     * @param subsetConfig defines which subset to use
     * @param fontLoadingConfig the font config, used to determine if font subsetting is enabled and if external fonts are enabled
     * @returns the created font family, and a boolean indicating if the font family was cached
     */
    async getFontFamily(
        config: FontFamilyConfig,
        subsetConfig: SubsetConfig,
        fontLoadingConfig: FontLoadingConfig
    ): Promise<{ fontFamily: FontFamily; cacheHit: boolean }> {
        const fontFamily = {
            config,
            normal: await this.getFont(config.normal, subsetConfig.normal, fontLoadingConfig),
            italic: await this.getFont(config.italic, subsetConfig.italic, fontLoadingConfig),
            bold: await this.getFont(config.bold, subsetConfig.bold, fontLoadingConfig),
            boldItalic: await this.getFont(config.boldItalic, subsetConfig.boldItalic, fontLoadingConfig)
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
     * @param subset the subset to use
     * @param fontLoadingConfig the font config, used to determine if font subsetting is enabled and if external fonts are enabled
     * @returns the font
     */
    private async getFont(
        config: FontConfig,
        subset: string | undefined,
        fontLoadingConfig: FontLoadingConfig
    ): Promise<SubsettedFont | undefined> {
        if (subset == undefined) {
            return undefined;
        }
        const fetchResult = await this.fetchFont(config, fontLoadingConfig);

        const computedSubset = fontLoadingConfig.enableFontSubsetting ? subset : undefined;
        return this.subsetFontCache.getOrCompute(
            { variationSettings: config.variationSettings, id: fetchResult.id, subset: computedSubset },
            async () => {
                const subsettedFont = await this.subsetManager.subsetFont(
                    fetchResult.font,
                    computedSubset,
                    config.variationSettings
                );
                return {
                    id: `custom_${uuid().replace(/-/g, "")}`,
                    font: createFont(subsettedFont),
                    subsettedFontEncoded: subsettedFont.toString("base64"),
                    originalFont: fetchResult.font
                };
            }
        );
    }

    /**
     * Fetches a font from the cache or the url
     *
     * @param fontLoadingConfig the font config, used to determine if font subsetting is enabled and if external fonts are enabled
     * @param config the config of the font
     * @returns the fetched
     */
    private async fetchFont(config: FontConfig, fontLoadingConfig: FontLoadingConfig) {
        if (!fontLoadingConfig.enableExternalFonts && !config.url.startsWith("data:")) {
            throw new Error(`External fonts are disabled, but font URL '${config.url}' is not a 'data:' URL`);
        }
        let fetchResult = this.fetchCache.get(config.url);
        if (!fetchResult) {
            const buffer = Buffer.from(await (await fetch(config.url)).arrayBuffer());
            fetchResult = { font: buffer, id: this.fetchIdCounter++ };
            this.fetchCache.set(config.url, fetchResult);
        }
        return fetchResult;
    }
}

/**
 * Configuration for font loading
 * Defines if font subsetting is enabled and if external fonts are enabled
 */
type FontLoadingConfig = Pick<DiagramConfig, "enableFontSubsetting" | "enableExternalFonts">;

/**
 * Key used to store subsetted fonts in the cache
 */
export interface SubsetFontKey extends Omit<FontConfig, "url"> {
    /**
     * The id of the fetched buffer
     */
    id: number;
    /**
     * The subset to use
     */
    subset: string | undefined;
}
