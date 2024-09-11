import { Root, Rect, Path, Text, Canvas, Element, convertFontsToCssStyle, Ellipse } from "@hylimo/diagram-common";
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

    override visitRoot(element: Root): SVGNode[] {
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
            const strokeWidth = element.stroke?.width;
            result.rx = Math.max(0, element.cornerRadius - (strokeWidth ? strokeWidth / 2 : 0));
        }
        return [result, ...this.visitChildren(element)];
    }

    override visitEllipse(element: Ellipse): SVGNode[] {
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
        return [result, ...this.visitChildren(element)];
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

    override visitText(element: Text): SVGNode[] {
        const result: SVGNode = {
            type: "text",
            children: [element.text],
            ...extractLayoutAttributes(element),
            ...extractFillAttributes(element),
            "font-family": element.fontFamily,
            "font-size": element.fontSize,
            "font-style": element.fontStyle,
            "font-weight": element.fontWeight
        };
        return [result];
    }

    override visitCanvas(element: Canvas): SVGNode[] {
        const result: SVGNode = {
            type: "g",
            transform: `translate(${element.dx}, ${element.dy})`,
            children: this.visitChildren(element)
        };
        return [result];
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

    /**
     * Visists all children of the provided element and calls visitElement on them
     *
     * @param element the element to visit the children of
     * @returns the result of the visit
     */
    private visitChildren(element: Element): SVGNode[] {
        return element.children.flatMap((child) => this.visitElement(child));
    }

    override visitElement(element: Element): SVGNode[] {
        return super.visitElement(element, undefined);
    }
}
