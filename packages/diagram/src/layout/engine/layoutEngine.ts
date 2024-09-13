import { BaseObject, FullObject, nativeToList } from "@hylimo/core";
import { Size, Point, Stroke, Canvas, Bounds } from "@hylimo/diagram-common";
import { FontManager } from "../../font/fontManager.js";
import { TextLayoutResult, TextLayouter } from "../../font/textLayouter.js";
import { generateStyles } from "../../styles.js";
import { LayoutedDiagram } from "../diagramLayoutResult.js";
import { LayoutConfig, SizeConstraints } from "../layoutElement.js";
import { layouts } from "../layouts.js";
import { FontCollection } from "../../font/fontCollection.js";
import { LayoutCache } from "./layoutCache.js";
import { StretchMode } from "../elements/pathLayoutConfig.js";
import { Layout } from "./layout.js";

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
     * Used to get fonts
     */
    readonly fontManager = new FontManager();

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
        const nativeFonts = diagram.getLocalFieldOrUndefined("fonts")?.value?.toNative();
        let cacheMiss = false;
        const fontFamilies = await Promise.all(
            nativeToList(nativeFonts).map(async (config) => {
                const { fontFamily, cacheHit } = await this.fontManager.getFontFamily(config);
                cacheMiss = cacheMiss || !cacheHit;
                return fontFamily;
            })
        );
        if (cacheMiss) {
            this.textCache.clear();
        } else {
            this.textCache.nextIteration();
        }
        this.pathCache.nextIteration();
        const fontFamilyConfigs = fontFamilies.map((family) => family.config);
        const layout = new Layout(
            this,
            generateStyles(diagram.getLocalFieldOrUndefined("styles")?.value as FullObject),
            new FontCollection(fontFamilies),
            fontFamilies[0]
        );
        const layoutElement = layout.measure(
            diagram.getLocalFieldOrUndefined("element")?.value as FullObject,
            undefined,
            {
                min: {
                    width: 0,
                    height: 0
                },
                max: {
                    width: Number.POSITIVE_INFINITY,
                    height: Number.POSITIVE_INFINITY
                }
            }
        );
        const elements = layout.layout(layoutElement, Point.ORIGIN, layoutElement.measuredSize!);
        let bounds: Bounds;
        if (elements.length == 1 && elements[0].type == Canvas.TYPE) {
            const canvas = elements[0] as Canvas;
            bounds = { position: { x: -canvas.dx, y: -canvas.dy }, size: layoutElement.measuredSize! };
            canvas.dx = 0;
            canvas.dy = 0;
        } else {
            bounds = { position: Point.ORIGIN, size: layoutElement.measuredSize! };
        }
        return {
            rootElement: {
                type: "root",
                id: "root",
                children: elements,
                fonts: fontFamilyConfigs,
                edits: {},
                hylimoBounds: bounds
            },
            elementLookup: layout.elementLookup,
            layoutElementLookup: layout.layoutElementLookup
        };
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
