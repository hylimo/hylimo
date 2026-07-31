import type { Root, Path, Canvas, Element, SimplifiedText, FontData } from "@hylimo/diagram-common";
import { convertFontsToCssStyle } from "@hylimo/diagram-common";
import { SimplifiedDiagramVisitor } from "@hylimo/diagram-common";
import XMLBuilder from "fast-xml-builder";
import {
    extractFillAttributes,
    extractLayoutAttributes,
    extractShapeStyleAttributes,
    extractStrokeAsFillAttributes
} from "./attributeHelpers.js";
import type { SimplifiedCanvasElement } from "@hylimo/diagram-common";
import type { Font } from "fontkit";
import { createFont } from "@hylimo/diagram";
import type { SimplifySvgPathModule } from "simplify-svg-path";
import SimplifySvgPathInit from "simplify-svg-path";
import { simplifySvgPath } from "@hylimo/wasm-libs";

/**
 * Distinguishes the ids one rendered document defines from those of the next one.
 *
 * An id is only unique within the diagram that generated it, but a rendered svg is routinely inlined
 * into a page next to others — a documentation page shows a dozen — and inline svg shares the
 * document's single id space. Two diagrams both defining `0_e0_0_d0-clip` would leave every
 * `url(#…)` in the second one resolving to the first one's clip region, so its dividers would be
 * clipped against a shape somewhere else entirely.
 *
 * A counter rather than a random token, so that a process which renders one diagram — the CLI, and
 * every batch that runs one file per process — produces byte-identical output every time.
 */
let renderCounter = 0;

/**
 * Renderer which renders a diagram to svg
 */
export class SVGRenderer {
    /**
     * Creates a new svg renderer
     *
     * @param margin the margin to apply to the bounding box
     */
    constructor(private readonly margin = 10) {}

    /**
     * Renders the provided root to an svg string
     *
     * @param root the diagram to render
     * @param textAsPath whether to render text as path
     * @returns the svg string
     */
    async render(root: Root, textAsPath: boolean): Promise<string> {
        const visitor = new SVGDiagramVisitor(this.margin, textAsPath);
        const simplifySvgPathModule: SimplifySvgPathModule | undefined = textAsPath
            ? await SimplifySvgPathInit({
                  instantiateWasm: (imports, successCallback) => {
                      void simplifySvgPath(imports).then((source) => {
                          successCallback(source.instance);
                      });
                      return undefined;
                  }
              })
            : undefined;
        const svg = visitor.visit(root, new SVGRendererContext(root, `d${renderCounter++}`, simplifySvgPathModule))[0];
        const xmlObj = this.svgNodeToXmlObject(svg);
        const builder = new XMLBuilder({
            ignoreAttributes: false,
            format: true,
            suppressEmptyNode: true
        });
        return builder.build(xmlObj);
    }

    /**
     * Converts an SVGNode to the object format expected by fast-xml-builder
     *
     * @param node the node to convert
     * @returns the xml object
     */
    private svgNodeToXmlObject(node: SVGNode): any {
        if (typeof node === "string") {
            return node;
        }

        const result: any = {};
        const element: any = {};

        const attributes: any = {};
        for (const [key, value] of Object.entries(node)) {
            if (key === "type" || key === "children") {
                continue;
            }
            if (typeof value === "string") {
                attributes["@_" + key] = value;
            } else if (typeof value === "number") {
                attributes["@_" + key] = value.toString();
            }
        }

        if (node.children.length > 0) {
            const children = node.children.map((child) => this.svgNodeToXmlObject(child));
            if (children.every((child) => typeof child === "string")) {
                element["#text"] = children.join("");
            } else {
                for (const child of children) {
                    if (typeof child === "string") {
                        if (!element["#text"]) {
                            element["#text"] = "";
                        }
                        element["#text"] += child;
                    } else {
                        for (const [childType, childValue] of Object.entries(child)) {
                            if (!element[childType]) {
                                element[childType] = [];
                            }
                            if (Array.isArray(element[childType])) {
                                element[childType].push(childValue);
                            } else {
                                element[childType] = [element[childType], childValue];
                            }
                        }
                    }
                }
            }
        }

        result[node.type] = { ...attributes, ...element };
        return result;
    }
}

/**
 * Type for attributes on svg nodes
 * False should be ignored
 */
type SVGNodeAttribute = string | number | false | SVGNode[];

/**
 * Type for svg nodes, can be either an inner text or an object with type, children and attributes
 */
type SVGNode =
    | string
    | {
          type: string;
          children: SVGNode[];
          [key: string]: SVGNodeAttribute;
      };

/**
 * Context for the SVGDiagramVisitor
 */
class SVGRendererContext {
    /**
     * Lookup for already loaded fonts
     */
    private readonly fonts: Map<string, Font> = new Map();

    /**
     * Lookup for font datas
     */
    private readonly fontDatas: Map<string, FontData>;

    /**
     * Creates a new svg renderer context
     *
     * @param root the root element of the diagram, provides the fonts
     * @param idPrefix distinguishes the ids of this document from those of any other inlined beside it
     * @param simplifySvgPath the module used to simplify glyph paths
     */
    constructor(
        root: Root,
        readonly idPrefix: string,
        private readonly simplifySvgPath?: SimplifySvgPathModule
    ) {
        this.fontDatas = new Map(root.fonts.map((fontData) => [fontData.fontFamily, fontData]));
    }

    /**
     * Gets the font with the provided family
     *
     * @param fontFamily the family of the font
     * @returns the font
     * @throws if the font is not found
     */
    getFont(fontFamily: string): Font {
        if (!this.fonts.has(fontFamily)) {
            const fontData = this.fontDatas.get(fontFamily);
            if (!fontData) {
                throw new Error(`Font with family ${fontFamily} not found`);
            }
            this.fonts.set(fontFamily, createFont(fontData.data));
        }
        return this.fonts.get(fontFamily)!;
    }

    /**
     * Method to simplify a glyph path using the simplifySvgPath module
     * The resulting path should be rendered with evenodd fill rule to match the original glyph
     * May return null if simplification is not possible
     *
     * @param path the path to simplify
     * @returns the simplified path or null
     * @throws if the simplifySvgPath module is not provided
     */
    simplifyGlyphPath(path: string): string | null {
        if (this.simplifySvgPath == null) {
            throw new Error("SimplifySvgPath module not provided");
        }
        return this.simplifySvgPath.simplifySvgPath(path);
    }
}

/**
 * Visitor to render the diagram to svg
 */
class SVGDiagramVisitor extends SimplifiedDiagramVisitor<SVGRendererContext, SVGNode[]> {
    /**
     * Creates a new svg diagram visitor
     *
     * @param margin the margin to apply to the bounding box
     * @param textAsPath whether to render text as path
     */
    constructor(
        private readonly margin: number,
        private readonly textAsPath: boolean
    ) {
        super();
    }

    override visitRoot(element: Root, context: SVGRendererContext): SVGNode[] {
        const viewBox = element.rootBounds;
        const x = viewBox.position.x - this.margin;
        const y = viewBox.position.y - this.margin;
        const width = viewBox.size.width + this.margin * 2;
        const height = viewBox.size.height + this.margin * 2;
        const additionalChildren: SVGNode[] = [];
        if (!this.textAsPath) {
            additionalChildren.push({
                type: "style",
                children: ["text { white-space: pre; }\n" + convertFontsToCssStyle(element.fonts)]
            });
        }
        const result = {
            type: "svg",
            children: [...additionalChildren, ...this.visitChildren(element, context)],
            viewBox: `${x} ${y} ${width} ${height}`,
            width,
            height,
            xmlns: "http://www.w3.org/2000/svg"
        };
        return [result];
    }

    override visitPath(element: Path, context: SVGRendererContext): SVGNode[] {
        if (this.textAsPath && element.clipFill != undefined) {
            return [this.renderClipAsFill(element), ...this.visitChildren(element, context)];
        }
        const result: SVGNode = {
            type: "path",
            children: [],
            ...extractShapeStyleAttributes(element),
            d: element.path,
            transform: `translate(${element.x}, ${element.y})`
        };
        const decoration: SVGNode[] =
            element.decoration != undefined
                ? [
                      {
                          type: "path",
                          children: [],
                          ...extractShapeStyleAttributes(element),
                          fill: "none",
                          d: element.decoration,
                          transform: `translate(${element.x}, ${element.y})`
                      }
                  ]
                : [];
        const painted = [result, ...decoration];
        if (element.clip != undefined) {
            return [this.clipPath(element, painted, context), ...this.visitChildren(element, context)];
        }
        return [...painted, ...this.visitChildren(element, context)];
    }

    /**
     * Paints the area a clipped stroke covers as a filled region instead of clipping it.
     *
     * `textAsPath` renders a diagram for consumers that cannot be relied on to have a font — and the
     * same consumers are the ones least likely to support `clipPath`, which many svg importers drop
     * silently, leaving a rule running out of its shape and across the page. The model carries the
     * exact area the clipped stroke covers for that reason, so the region is painted rather than
     * approximated here.
     *
     * @param element the path whose clipped area is painted
     * @returns the filled region
     */
    private renderClipAsFill(element: Path): SVGNode {
        return {
            type: "path",
            children: [],
            ...extractStrokeAsFillAttributes(element),
            stroke: "none",
            d: element.clipFill!,
            transform: `translate(${element.x}, ${element.y})`
        };
    }

    /**
     * Wraps the painted parts of a path in a clipped group.
     *
     * The translation moves from the element's own attributes onto the group, because `clip-path`
     * resolves against the coordinate system the clipped element establishes *for its children*, and
     * a `transform` on the clipped element itself is applied after the clip — which would offset the
     * two against each other by exactly the element's position.
     *
     * @param element the path whose clip region is applied
     * @param painted the nodes to clip, which lose their own transform to the group
     * @param context provides the prefix keeping the id unique in the document the svg ends up in
     * @returns the clipped group
     */
    private clipPath(element: Path, painted: SVGNode[], context: SVGRendererContext): SVGNode {
        const id = `${context.idPrefix}-${element.id}-clip`;
        return {
            type: "g",
            transform: `translate(${element.x}, ${element.y})`,
            "clip-path": `url(#${id})`,
            children: [
                {
                    type: "clipPath",
                    id,
                    children: [{ type: "path", children: [], d: element.clip! }]
                },
                ...painted.map((node): SVGNode => (typeof node === "string" ? node : { ...node, transform: false }))
            ]
        };
    }

    override visitText(element: SimplifiedText, context: SVGRendererContext): SVGNode[] {
        return [
            ...(this.textAsPath ? this.renderTextAsPath(context, element) : [this.renderTextAsText(element)]),
            ...this.visitChildren(element, context)
        ];
    }

    /**
     * Renders a text element as path
     *
     * @param context the context to use
     * @param element the text element to render
     * @returns the svg nodes representing the text
     */
    private renderTextAsPath(context: SVGRendererContext, element: SimplifiedText): SVGNode[] {
        const font = context.getFont(element.fontFamily);
        const glyphRun = font.layout(element.text, element.fontFeatureSettings);
        let offset = 0;
        const glyphs: Array<{ path: string }> = [];

        for (const glyph of glyphRun.glyphs) {
            if (element.fill != undefined) {
                glyphs.push({
                    path: glyph.path.translate(offset, 0).toSVG()
                });
            }
            offset += glyph.advanceWidth;
        }

        const scalingFactor = element.fontSize / font.unitsPerEm;
        const baseAttributes = {
            ...extractFillAttributes(element),
            transform: `translate(${element.x}, ${element.y}) scale(${scalingFactor}, ${-scalingFactor})`
        };

        return this.simplifyGlyphs(glyphs, baseAttributes, context, element.text);
    }

    /**
     * Recursively simplifies glyph paths with fallback splitting.
     * First attempts to simplify all glyphs together. If that fails, splits them in half
     * and recursively simplifies each half. If a single glyph fails, logs a warning
     * and returns the original path.
     *
     * @param glyphs the glyphs to simplify
     * @param baseAttributes the base SVG attributes to apply to each path
     * @param context the renderer context for simplification
     * @param text the original text for warning messages
     * @returns an array of SVG path nodes
     */
    private simplifyGlyphs(
        glyphs: Array<{ path: string }>,
        baseAttributes: Record<string, any>,
        context: SVGRendererContext,
        text: string
    ): SVGNode[] {
        if (glyphs.length === 0) {
            return [];
        }

        const joinedPath = glyphs.map((g) => g.path).join(" ");
        const simplified = context.simplifyGlyphPath(joinedPath);

        if (simplified != null) {
            return [
                {
                    type: "path",
                    children: [],
                    ...baseAttributes,
                    d: simplified,
                    "fill-rule": "evenodd"
                }
            ];
        }

        if (glyphs.length === 1) {
            // oxlint-disable-next-line no-console
            console.warn(`Failed to simplify glyph path for text "${text}"`);
            return [
                {
                    type: "path",
                    children: [],
                    ...baseAttributes,
                    d: glyphs[0].path,
                    "fill-rule": "nonzero"
                }
            ];
        }

        const mid = Math.floor(glyphs.length / 2);
        const left = glyphs.slice(0, mid);
        const right = glyphs.slice(mid);

        return [
            ...this.simplifyGlyphs(left, baseAttributes, context, text),
            ...this.simplifyGlyphs(right, baseAttributes, context, text)
        ];
    }

    /**
     * Renders a text element as text
     *
     * @param element the text element to render
     * @returns the svg node representing the text
     */
    private renderTextAsText(element: SimplifiedText): SVGNode {
        const fontFeatureSettings = element.fontFeatureSettings?.map((feature) => `"${feature}"`).join(", ");
        return {
            type: "text",
            children: [element.text],
            ...extractLayoutAttributes(element),
            ...extractFillAttributes(element),
            "font-family": element.fontFamily,
            "font-size": element.fontSize,
            style: fontFeatureSettings != undefined ? `font-feature-settings: ${fontFeatureSettings}` : ""
        };
    }

    override visitCanvas(element: Canvas, context: SVGRendererContext): SVGNode[] {
        const result: SVGNode = {
            type: "g",
            transform: `translate(${element.dx}, ${element.dy})`,
            children: this.visitChildren(element, context)
        };
        return [result];
    }

    override visitCanvasElement(element: SimplifiedCanvasElement, context: SVGRendererContext): SVGNode[] {
        const position = element.pos;
        const result: SVGNode = {
            type: "g",
            transform: `translate(${position.x}, ${position.y}) rotate(${element.rotation})`,
            children: this.visitChildren(element, context)
        };
        return [result];
    }

    /**
     * Visists all children of the provided element and calls visitElement on them
     *
     * @param element the element to visit the children of
     * @param context the context to use
     * @returns the result of the visit
     */
    private visitChildren(element: Element, context: SVGRendererContext): SVGNode[] {
        return element.children.flatMap((child) => this.visitElement(child, context));
    }
}
