import {
    Root,
    Rect,
    Path,
    Canvas,
    Element,
    convertFontsToCssStyle,
    Ellipse,
    SimplifiedText,
    FontData
} from "@hylimo/diagram-common";
import { SimplifiedDiagramVisitor } from "@hylimo/diagram-common";
import {
    extractFillAttributes,
    extractLayoutAttributes,
    extractOutlinedShapeAttributes,
    extractShapeStyleAttributes
} from "./attributeHelpers.js";
import { SimplifiedCanvasElement } from "@hylimo/diagram-common";
import { create } from "xmlbuilder2";
import { XMLBuilder } from "xmlbuilder2/lib/interfaces.js";
import { create as createFont, Font } from "fontkit";
import { Buffer } from "buffer";

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
    render(root: Root, textAsPath: boolean): string {
        const visitor = new SVGDiagramVisitor(this.margin, textAsPath);
        const svg = visitor.visit(root, new SVGRendererContext(root))[0];
        const builder = create();
        this.toXml(svg, builder);
        return builder.doc().end({ prettyPrint: true });
    }

    /**
     * Converts the provided node to xml using the builder
     *
     * @param node the node to convert
     * @param builder the builder to use
     */
    private toXml(node: SVGNode, builder: XMLBuilder): void {
        if (typeof node === "string") {
            builder.txt(node);
        } else {
            const element = builder.ele(node.type);
            for (const [key, value] of Object.entries(node)) {
                if (key === "type" || key === "children") {
                    continue;
                }
                if (typeof value === "string") {
                    element.att(key, value);
                } else if (typeof value === "number") {
                    element.att(key, value.toString());
                }
            }
            for (const child of node.children) {
                this.toXml(child, element);
            }
        }
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
    constructor(root: Root) {
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
            const buffer = Buffer.from(fontData.data, "base64");
            this.fonts.set(fontFamily, createFont(buffer) as Font);
        }
        return this.fonts.get(fontFamily)!;
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
        let styles = "text { white-space: pre; }\n";
        if (!this.textAsPath) {
            styles += convertFontsToCssStyle(element.fonts);
        }
        const additionalChildren: SVGNode[] = [
            {
                type: "style",
                children: [styles]
            }
        ];
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
            this.textAsPath ? this.renderTextAsPath(context, element) : this.renderTextAsText(element),
            ...this.visitChildren(element, context)
        ];
    }

    /**
     * Renders a text element as path
     *
     * @param context the context to use
     * @param element the text element to render
     * @returns the svg node representing the text
     */
    private renderTextAsPath(context: SVGRendererContext, element: SimplifiedText): SVGNode {
        const font = context.getFont(element.fontFamily);
        const glyphRun = font.layout(element.text);
        let offset = 0;
        const paths: string[] = [];
        for (const glyph of glyphRun.glyphs) {
            if (!/^\s*$/.test(String.fromCodePoint(...glyph.codePoints)) && element.fill != undefined) {
                paths.push(glyph.path.translate(offset, 0).toSVG());
            }
            offset += glyph.advanceWidth;
        }
        const scalingFactor = element.fontSize / font.unitsPerEm;
        return {
            type: "path",
            children: [],
            ...extractFillAttributes(element),
            d: paths.join(" "),
            transform: `translate(${element.x}, ${element.y}) scale(${scalingFactor}, ${-scalingFactor})`
        };
    }

    /**
     * Renders a text element as text
     *
     * @param element the text element to render
     * @returns the svg node representing the text
     */
    private renderTextAsText(element: SimplifiedText): SVGNode {
        return {
            type: "text",
            children: [element.text],
            ...extractLayoutAttributes(element),
            ...extractFillAttributes(element),
            "font-family": element.fontFamily,
            "font-size": element.fontSize
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
