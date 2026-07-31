import type { FullObject, InterpreterContext } from "@hylimo/core";
import { nativeToList } from "@hylimo/core";
import type { Size, Stroke, FontFamilyConfig, FontData, DiagramConfig } from "@hylimo/diagram-common";
import { Point, Canvas } from "@hylimo/diagram-common";
import type { SubsetFontKey } from "../font/fontManager.js";
import { FontManager } from "../font/fontManager.js";
import type { TextLayoutResult } from "../font/textLayouter.js";
import { TextLayouter } from "../font/textLayouter.js";
import type { LayoutedDiagram } from "../diagramLayoutResult.js";
import type { LayoutConfig, LayoutElement, SizeConstraints } from "../layoutElement.js";
import { layouts } from "../layouts.js";
import { FontCollection } from "../font/fontCollection.js";
import { LayoutCache } from "./layoutCache.js";
import type { StretchMode } from "../elements/pathLayoutConfig.js";
import type { ShapeLayoutResult } from "../shape/fixpoint.js";
import type { ShapeStroke, SizingMode } from "../shape/types.js";
import type { DividerAxis, DividerGeometry } from "../shape/divider.js";
import { Layout } from "./layout.js";
import type { SubsettedFont } from "../font/fontFamily.js";
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
 * Cache key for the parametric shape fixpoint. Everything that determines the solved outline is
 * captured, so an unchanged shape re-uses the (relatively expensive) iterative result.
 */
interface ShapeCacheKey {
    /**
     * The outline path source (with `w`/`h`/`r` placeholders)
     */
    path: string;
    /**
     * The optional decoration path source
     */
    decoration: string | undefined;
    /**
     * The resolved stroke
     */
    stroke: ShapeStroke;
    /**
     * The corner rounding (`r`)
     */
    rounding: number;
    /**
     * Whether the target is the outer bounds or the content box
     */
    mode: SizingMode;
    /**
     * The target size
     */
    target: Size;
    /**
     * The content size the resulting content box has to hold, if any
     */
    required?: Size;
}

/**
 * Cache key for the divider geometry of a shape. One entry per shape per solved size, shared by
 * every divider in that shape — the per-divider query on top of it is cheap enough not to need one
 * of its own.
 */
interface DividerGeometryKey {
    /**
     * The solved outline path, in shape-local coordinates
     */
    path: string;
    /**
     * The solved decoration sub-paths, if the shape has any
     */
    decoration: string | undefined;
    /**
     * The stroke the shape is painted with
     */
    stroke: ShapeStroke;
    /**
     * The axis the dividers of the shape run along. A shape has exactly one flow direction, so this
     * still leaves one entry per shape; it is part of the key because the geometry is transposed
     * once, at build time, so that the vertical case needs no second implementation.
     */
    axis: DividerAxis;
}

/**
 * The root element of the layout with the layout
 */
export class LayoutWithRoot {
    /**
     * Creates a new layout with root
     *
     * @param root - The root element of the layout
     * @param layout - The layout
     * @param fontFamilies - The fonts root uses
     */
    constructor(
        public readonly root: LayoutElement,
        public readonly layout: Layout,
        public readonly fontFamilies: FontFamilyConfig[]
    ) {}
}

/**
 * Performs layout, generates a model as a result
 */
export class LayoutEngine {
    /**
     * The class used to mark prediction elements
     */
    static readonly PREDICTION_CLASS = "prediction-element";

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
     * Cache for the parametric shape fixpoint
     */
    readonly shapeCache = new LayoutCache<ShapeCacheKey, ShapeLayoutResult>(CACHE_TTL);

    /**
     * Cache for the divider geometry of a shape
     */
    readonly dividerCache = new LayoutCache<DividerGeometryKey, DividerGeometry>(CACHE_TTL);

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
     * Creates a layout for a root element
     *
     * @param element the element to layout
     * @param styles the styles to use
     * @param fonts the fonts to use
     * @param context the context to use
     * @returns the layout with the LayoutElement created for {@link element}
     */
    createLayout(
        element: FullObject,
        styles: FullObject,
        fonts: FullObject,
        context: InterpreterContext
    ): LayoutWithRoot {
        const nativeFonts = nativeToList(fonts.toNative());
        const layout = new Layout(this, styles, new FontCollection(), nativeFonts[0].fontFamily, context);
        const layoutElement = layout.create(element, undefined);
        return new LayoutWithRoot(layoutElement, layout, nativeFonts);
    }

    /**
     * Layouts a diagram defined using syncscript
     *
     * @param layoutWithRoot the layout with the root element
     * @param config the configuration to use
     * @param predictionMode whether to use prediction mode
     * @returns the layouted diagram
     */
    async layout(
        { root, layout, fontFamilies }: LayoutWithRoot,
        config: DiagramConfig,
        predictionMode: boolean
    ): Promise<LayoutedDiagram> {
        this.nextCacheGeneration();
        await this.initFonts(root, fontFamilies, layout, config);
        if (predictionMode) {
            this.collapseNonPredictionElements(root);
        }
        const canvas = this.layoutElement(layout, root);
        const rootMargins = root.layoutInformation!;
        return {
            rootElement: {
                type: "root",
                id: canvas.id,
                children: canvas.children,
                edits: canvas.edits,
                rootBounds: {
                    position: { x: -canvas.dx, y: -canvas.dy },
                    size: {
                        width: canvas.width + rootMargins.marginLeft + rootMargins.marginRight,
                        height: canvas.height + rootMargins.marginTop + rootMargins.marginBottom
                    }
                },
                fonts: this.generateSubsettedFontData(layout),
                preview: predictionMode
            },
            elementLookup: layout.elementLookup,
            layoutElementLookup: layout.layoutElementLookup
        };
    }

    /**
     * Hides all non-prediction elements
     * These are all direct children of the root element without the class {@link LayoutEngine.PREDICTION_CLASS}
     *
     * @param root the root element
     */
    private collapseNonPredictionElements(root: LayoutElement): void {
        for (const element of root.children) {
            if (!element.class.has(LayoutEngine.PREDICTION_CLASS)) {
                this.collapseElementRecursively(element);
            }
        }
    }

    /**
     * Collapses an element and all its children
     *
     * @param element the element to collapse
     */
    private collapseElementRecursively(element: LayoutElement): void {
        element.isCollapsed = true;
        element.isHidden = true;
        for (const child of element.children) {
            this.collapseElementRecursively(child);
        }
    }

    /**
     * Starts the next iteration for each cache, which is the only path evicting stale entries.
     * Called once per render at the start of {@link layout}, before the entries of that render are
     * touched, so everything the render uses ends it with its age reset.
     */
    nextCacheGeneration(): void {
        this.textCache.nextIteration();
        this.pathCache.nextIteration();
        this.shapeCache.nextIteration();
        this.dividerCache.nextIteration();
        this.subsetFontCache.nextIteration();
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
     * @returns the layouted canvas child element
     */
    private layoutElement(layout: Layout, layoutElement: LayoutElement): Canvas {
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
        if (children.length != 1 || children[0].type != Canvas.TYPE) {
            throw new Error("Root element must be a canvas");
        }
        return children[0] as Canvas;
    }

    /**
     * Initializes the fonts for the layout
     * Also handles font related caching
     *
     * @param layoutElement the root layout element
     * @param fontFamilies the font families to initialize
     * @param layout the layout to use
     * @param diagramConfig the diagram config
     */
    private async initFonts(
        layoutElement: LayoutElement,
        fontFamilies: FontFamilyConfig[],
        layout: Layout,
        diagramConfig: DiagramConfig
    ): Promise<void> {
        const subsetCollector = new SubsetCollector(layoutElement, fontFamilies[0].fontFamily);
        let cacheMiss = false;
        await Promise.all(
            fontFamilies.map(async (config) => {
                const { fontFamily, cacheHit } = await this.fontManager.getFontFamily(
                    config,
                    subsetCollector.subsets.get(config.fontFamily) ?? {},
                    diagramConfig
                );
                cacheMiss ||= !cacheHit;
                layout.fonts.registerFont(fontFamily);
                return fontFamily;
            })
        );
        if (cacheMiss) {
            this.textCache.clear();
        }
    }
}
