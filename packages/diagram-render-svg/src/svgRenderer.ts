import type { Root, Rect, Path, Canvas, Element, Ellipse, SimplifiedText, FontData } from "@hylimo/diagram-common";
import { convertFontsToCssStyle } from "@hylimo/diagram-common";
import { SimplifiedDiagramVisitor } from "@hylimo/diagram-common";
import { XMLBuilder } from "fast-xml-parser";
import {
    extractFillAttributes,
    extractLayoutAttributes,
    extractOutlinedShapeAttributes,
    extractShapeStyleAttributes
} from "./attributeHelpers.js";
import type { SimplifiedCanvasElement } from "@hylimo/diagram-common";
import type { Font } from "fontkit";
import { createFont } from "@hylimo/diagram";
import type { SimplifySvgPathModule } from "simplify-svg-path";
import SimplifySvgPathInit from "simplify-svg-path";
import { simplifySvgPath } from "@hylimo/wasm-libs";

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
                      simplifySvgPath(imports).then((source) => {
                          successCallback(source.instance);
                      });
                      return undefined;
                  }
              })
            : undefined;
        const svg = visitor.visit(root, new SVGRendererContext(root, simplifySvgPathModule))[0];
        const xmlObj = this.svgNodeToXmlObject(svg);
        const builder = new XMLBuilder({
            ignoreAttributes: false,
            format: true,
            suppressEmptyNode: true
        });
        return builder.build(xmlObj);
    }

    /**
     * Converts an SVGNode to the object format expected by fast-xml-parser
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
     */
    constructor(
        root: Root,
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

    override visitRect(element: Rect, context: SVGRendererContext): SVGNode[] {
        const result: SVGNode = {
            type: "rect",
            children: [],
            ...extractOutlinedShapeAttributes(element)
        };
        if (element.cornerRadius) {
            const strokeWidth = element.stroke?.width;
            result.rx = Math.max(0, element.cornerRadius - (strokeWidth ? strokeWidth / 2 : 0));
        }
        return [result, ...this.visitChildren(element, context)];
    }

    override visitEllipse(element: Ellipse, context: SVGRendererContext): SVGNode[] {
        const strokeWidth = element.stroke?.width ?? 0;
        const result: SVGNode = {
            type: "ellipse",
            children: [],
            ...extractShapeStyleAttributes(element),
            cx: element.x + element.width / 2,
            cy: element.y + element.height / 2,
            rx: (element.width - strokeWidth) / 2,
            ry: (element.height - strokeWidth) / 2
        };
        return [result, ...this.visitChildren(element, context)];
    }

    override visitPath(element: Path): SVGNode[] {
        const result: SVGNode = {
            type: "path",
            children: [],
            ...extractShapeStyleAttributes(element),
            d: element.path,
            transform: `translate(${element.x}, ${element.y})`
        };
        return [result];
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
            // eslint-disable-next-line no-console
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
