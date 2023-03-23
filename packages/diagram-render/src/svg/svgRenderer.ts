import { Root, Rect, Path, Text, Canvas, Element, WithBounds, convertFontsToCssStyle } from "@hylimo/diagram-common";
import { SimplifiedDiagramVisitor } from "@hylimo/diagram-common";
import { extractLayoutAttributes, extractOutlinedShapeAttributes, extractShapeAttributes } from "./attributeHelpers";
import { SimplifiedCanvasElement } from "@hylimo/diagram-common";
import { create } from "xmlbuilder2";
import { XMLBuilder } from "xmlbuilder2/lib/interfaces";

/**
 * Renderer which renders a diagram to svg
 */
export class SVGRenderer {
    /**
     * Visitor to render the diagram to svg
     */
    private readonly visitor: SVGDiagramVisitor;

    /**
     * Creates a new svg renderer
     *
     * @param margin the margin to apply to the bounding box
     */
    constructor(margin = 10) {
        this.visitor = new SVGDiagramVisitor(margin);
    }

    /**
     * Renders the provided root to an svg string
     *
     * @param root the diagram to render
     * @returns the svg string
     */
    render(root: Root): string {
        const svg = this.visitor.visit(root, undefined)[0];
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
 * Visitor to render the diagram to svg
 */
class SVGDiagramVisitor extends SimplifiedDiagramVisitor<undefined, SVGNode[]> {
    /**
     * Creates a new svg diagram visitor
     *
     * @param margin the margin to apply to the bounding box
     */
    constructor(private readonly margin: number) {
        super();
    }

    override visitRoot(element: WithBounds<Root>): SVGNode[] {
        const viewBox = element.bounds;
        const x = viewBox.position.x - this.margin;
        const y = viewBox.position.y - this.margin;
        const width = viewBox.size.width + this.margin * 2;
        const height = viewBox.size.height + this.margin * 2;
        const additionalChildren: SVGNode[] = [
            {
                type: "style",
                children: ["text { white-space: pre; }\n" + convertFontsToCssStyle(element.fonts)]
            }
        ];
        const result = {
            type: "svg",
            children: [...additionalChildren, ...this.visitChildren(element)],
            viewBox: `${x} ${y} ${width} ${height}`,
            width,
            height,
            xmlns: "http://www.w3.org/2000/svg"
        };
        return [result];
    }

    override visitRect(element: Rect): SVGNode[] {
        const result: SVGNode = {
            type: "rect",
            children: [],
            ...extractOutlinedShapeAttributes(element)
        };
        if (element.cornerRadius) {
            result.rx = Math.max(0, element.cornerRadius - (element.strokeWidth ? element.strokeWidth / 2 : 0));
        }
        return [result, ...this.visitChildren(element)];
    }

    override visitPath(element: Path): SVGNode[] {
        const result: SVGNode = {
            type: "path",
            children: [],
            ...extractShapeAttributes(element),
            "stroke-linejoin": element.lineJoin,
            "stroke-linecap": element.lineCap,
            "stroke-miterlimit": element.miterLimit,
            d: element.path,
            transform: `translate(${element.x}, ${element.y})`
        };
        return [result];
    }

    override visitText(element: Text): SVGNode[] {
        const result: SVGNode = {
            type: "text",
            children: [element.text],
            ...extractLayoutAttributes(element),
            fill: element.fill,
            "font-family": element.fontFamily,
            "font-size": element.fontSize,
            "font-style": element.fontStyle,
            "font-weight": element.fontWeight
        };
        return [result];
    }

    override visitCanvas(element: Canvas): SVGNode[] {
        return this.visitChildren(element);
    }

    override visitCanvasElement(element: SimplifiedCanvasElement): SVGNode[] {
        const position = element.pos;
        const result: SVGNode = {
            type: "g",
            transform: `translate(${position.x}, ${position.y}) rotate(${element.rotation})`,
            children: this.visitChildren(element)
        };
        return [result];
    }

    private visitChildren(element: Element): SVGNode[] {
        return element.children.flatMap((child) => this.visitElement(child));
    }

    override visitElement(element: Element): SVGNode[] {
        return super.visitElement(element, undefined);
    }
}
