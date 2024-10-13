import { BaseObject, FullObject, nativeToList } from "@hylimo/core";
import { Size, Point, Stroke, Canvas, Bounds, FontFamilyConfig, Element, FontData } from "@hylimo/diagram-common";
import { FontManager, SubsetFontKey } from "../font/fontManager.js";
import { TextLayoutResult, TextLayouter } from "../font/textLayouter.js";
import { generateStyles } from "../../styles.js";
import { LayoutedDiagram } from "../diagramLayoutResult.js";
import { LayoutConfig, LayoutElement, SizeConstraints } from "../layoutElement.js";
import { layouts } from "../layouts.js";
import { FontCollection } from "../font/fontCollection.js";
import { LayoutCache } from "./layoutCache.js";
import { StretchMode } from "../elements/pathLayoutConfig.js";
import { Layout } from "./layout.js";
import { SubsettedFont } from "../font/fontFamily.js";
import { SubsetCollector } from "../font/subsetCollector.js";

/**
 * The amount of iterations which are cached
 */
const CACHE_TTL = 3;

/**
 * Key of the text cache
 */
interface TextCacheKey {
    /**
     * the max width provided to layout
     */
    maxWidth: number;
    /**
     * The styles of the spans the text consists of
     */
    spans: Record<string, any>[];
}

/**
 * Cache key for path layouting
 */
interface PathCacheKey {
    /**
     * The path to layout
     */
    path: string;
    /**
     * The stroke required for layouting
     */
    stroke: Stroke | undefined;
    /**
     * The size constraints
     */
    constraints: SizeConstraints;
    /**
     * The stretch mode
     */
    stretch: StretchMode;
}

/**
 * Cache entry of layouted paths
 */
export interface LayoutedPath {
    /**
     * The layouted path
     */
    path: string;
    /**
     * The size of the layouted path
     */
    size: Size;
}

/**
 * Performs layout, generates a model as a result
 */
export class LayoutEngine {
    /**
     * Lookup for layout configs
     */
    readonly layoutConfigs: Map<string, LayoutConfig> = new Map();

    /**
     * Text layout engine
     */
    readonly textLayouter = new TextLayouter();

    /**
     * Cache used for text layouting
     */
    readonly textCache = new LayoutCache<TextCacheKey, TextLayoutResult>(CACHE_TTL);

    /**
     * Cache for path layouting
     */
    readonly pathCache = new LayoutCache<PathCacheKey, LayoutedPath>(CACHE_TTL);

    /**
     * Cache for subsetted fonts
     */
    readonly subsetFontCache = new LayoutCache<SubsetFontKey, Promise<SubsettedFont>>(CACHE_TTL);

    /**
     * Used to get fonts
     */
    readonly fontManager = new FontManager(this.subsetFontCache);

    /**
     * Creates a new layout engine
     */
    constructor() {
        for (const config of layouts) {
            this.layoutConfigs.set(config.type, config);
        }
    }

    /**
     * Layouts a diagram defined using syncscript
     *
     * @param diagram the diagram to layout
     * @returns the layouted diagram
     */
    async layout(diagram: BaseObject): Promise<LayoutedDiagram> {
        this.assertDiagram(diagram);
        const nativeFonts = nativeToList(diagram.getLocalFieldOrUndefined("fonts")?.value?.toNative());
        const layout = new Layout(
            this,
            generateStyles(diagram.getLocalFieldOrUndefined("styles")?.value as FullObject),
            new FontCollection(),
            nativeFonts[0].fontFamily
        );
        const layoutElement = layout.create(
            diagram.getLocalFieldOrUndefined("element")?.value as FullObject,
            undefined
        );
        await this.initFonts(layoutElement, nativeFonts, layout);
        this.pathCache.nextIteration();

        return {
            rootElement: {
                type: "root",
                id: "root",
                ...this.layoutElement(layout, layoutElement),
                fonts: this.generateSubsettedFontData(layout),
                edits: {}
            },
            elementLookup: layout.elementLookup,
            layoutElementLookup: layout.layoutElementLookup
        };
    }

    /**
     * Generates the subsetted font data
     *
     * @param layout the layout to use
     * @returns the subsetted font data
     */
    private generateSubsettedFontData(layout: Layout): FontData[] {
        const fonts: SubsettedFont[] = [];
        for (const fontFamily of layout.fonts.fontFamilies.values()) {
            if (fontFamily.normal != undefined) {
                fonts.push(fontFamily.normal);
            }
            if (fontFamily.italic != undefined) {
                fonts.push(fontFamily.italic);
            }
            if (fontFamily.bold != undefined) {
                fonts.push(fontFamily.bold);
            }
            if (fontFamily.boldItalic != undefined) {
                fonts.push(fontFamily.boldItalic);
            }
        }
        return fonts.map((font) => ({
            fontFamily: font.id,
            data: font.subsettedFontEncoded
        }));
    }

    /**
     * Layouts the root element
     * First measures the element, then layouts it
     *
     * @param layout the layout to use
     * @param layoutElement the element to layout
     * @returns all children of the root element and the bounds of the root element
     */
    private layoutElement(layout: Layout, layoutElement: LayoutElement): { children: Element[]; rootBounds: Bounds } {
        layout.measure(layoutElement, {
            min: {
                width: 0,
                height: 0
            },
            max: {
                width: Number.POSITIVE_INFINITY,
                height: Number.POSITIVE_INFINITY
            }
        });
        const children = layout.layout(layoutElement, Point.ORIGIN, layoutElement.measuredSize!);
        let bounds: Bounds;
        if (children.length == 1 && children[0].type == Canvas.TYPE) {
            const canvas = children[0] as Canvas;
            bounds = { position: { x: -canvas.dx, y: -canvas.dy }, size: layoutElement.measuredSize! };
            canvas.dx = 0;
            canvas.dy = 0;
        } else {
            bounds = { position: Point.ORIGIN, size: layoutElement.measuredSize! };
        }
        return { children, rootBounds: bounds };
    }

    /**
     * Initializes the fonts for the layout
     * Also handles font related caching
     *
     * @param layoutElement the root layout element
     * @param fontFamilies the font families to initialize
     * @param layout the layout to use
     */
    private async initFonts(
        layoutElement: LayoutElement,
        fontFamilies: FontFamilyConfig[],
        layout: Layout
    ): Promise<void> {
        const subsetCollector = new SubsetCollector(layoutElement, fontFamilies[0].fontFamily);
        let cacheMiss = false;
        await Promise.all(
            fontFamilies.map(async (config) => {
                const { fontFamily, cacheHit } = await this.fontManager.getFontFamily(
                    config,
                    subsetCollector.subsets.get(config.fontFamily) ?? {}
                );
                cacheMiss = cacheMiss || !cacheHit;
                layout.fonts.registerFont(fontFamily);
                return fontFamily;
            })
        );
        this.subsetFontCache.nextIteration();
        if (cacheMiss) {
            this.textCache.clear();
        } else {
            this.textCache.nextIteration();
        }
    }

    /**
     * Asserts that the provided diagram is a valid diagram
     *
     * @param diagram the diagram to check
     */
    private assertDiagram(diagram: BaseObject): asserts diagram is FullObject {
        if (!(diagram instanceof FullObject)) {
            throw new Error("A Diagram must be an Object");
        }
        if (!diagram.hasField("element") || !diagram.hasField("fonts") || !diagram.hasField("styles")) {
            throw new Error("A Diagram must have an element, fonts and styles fields");
        }
    }
}
