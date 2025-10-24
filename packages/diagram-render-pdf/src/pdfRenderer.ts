import type {
    Canvas,
    Element,
    Ellipse,
    Path,
    Rect,
    Root,
    Shape,
    SimplifiedCanvasElement,
    SimplifiedText
} from "@hylimo/diagram-common";
import { SimplifiedDiagramVisitor } from "@hylimo/diagram-common";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import type { ShapeStyleAttributes } from "@hylimo/diagram-render-svg";
import {
    extractFillAttributes,
    extractOutlinedShapeAttributes,
    extractShapeStyleAttributes
} from "@hylimo/diagram-render-svg";
import { Buffer } from "buffer/index.js";

/**
 * Renderer which renders a diagram to pdf
 */
export class PDFRenderer {
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
     * @param background the background color
     * @returns the svg string
     */
    async render(root: Root, background: string): Promise<Uint8Array<ArrayBuffer>[]> {
        return new Promise(async (resolve, reject) => {
            try {
                const parts: Uint8Array<ArrayBuffer>[] = [];
                const document = new PDFDocument({ autoFirstPage: false });
                const visitor = new PDFDiagramVisitor(this.margin, background);
                document.on("data", (data: Uint8Array<ArrayBuffer>) => parts.push(data));
                document.on("end", () => resolve(parts));
                visitor.visit(root, document);
                document.end();
            } catch (e) {
                reject(e);
            }
        });
    }
}

/**
 * Visitor which renders a diagram to pdf
 */
export class PDFDiagramVisitor extends SimplifiedDiagramVisitor<PDFKit.PDFDocument, void> {
    /**
     * Creates a new pdf diagram visitor
     *
     * @param margin the margin to apply to the bounding box
     * @param background the background color
     */
    constructor(
        private readonly margin: number,
        private readonly background: string
    ) {
        super();
    }

    override visitRoot(element: Root, context: PDFKit.PDFDocument): void {
        for (const font of element.fonts) {
            context.registerFont(font.fontFamily, Buffer.from(font.data, "base64"));
        }
        const [width, height] = [
            element.rootBounds.size.width + 2 * this.margin,
            element.rootBounds.size.height + 2 * this.margin
        ];
        context.addPage({
            size: [width, height]
        });
        context.rect(0, 0, width, height).fill(this.background);
        context.translate(-element.rootBounds.position.x + this.margin, -element.rootBounds.position.y + this.margin);
        this.visitChildren(element, context);
    }

    override visitRect(element: Rect, context: PDFKit.PDFDocument): void {
        if (this.isShapeVisible(element)) {
            const shapeAttributes = extractOutlinedShapeAttributes(element);
            if (element.cornerRadius) {
                const radius = Math.min(element.cornerRadius, element.width / 2, element.height / 2);
                context.roundedRect(
                    shapeAttributes.x,
                    shapeAttributes.y,
                    shapeAttributes.width,
                    shapeAttributes.height,
                    radius
                );
            } else {
                context.rect(shapeAttributes.x, shapeAttributes.y, shapeAttributes.width, shapeAttributes.height);
            }
            this.drawShape(context, shapeAttributes, element);
        }
        this.visitChildren(element, context);
    }

    override visitEllipse(element: Ellipse, context: PDFKit.PDFDocument): void {
        if (this.isShapeVisible(element)) {
            const shapeAttributes = extractShapeStyleAttributes(element);
            const strokeWidth = element.stroke?.width ?? 0;
            context.ellipse(
                element.x + element.width / 2,
                element.y + element.height / 2,
                (element.width - strokeWidth) / 2,
                (element.height - strokeWidth) / 2
            );
            this.drawShape(context, shapeAttributes, element);
        }
        this.visitChildren(element, context);
    }

    override visitPath(element: Path, context: PDFKit.PDFDocument): void {
        if (this.isShapeVisible(element)) {
            const shapeAttributes = extractShapeStyleAttributes(element);
            context.save();
            context.translate(element.x, element.y);
            context.path(element.path);
            this.drawShape(context, shapeAttributes, element);
            context.restore();
        }
    }

    override visitText(element: SimplifiedText, context: PDFKit.PDFDocument): void {
        context.fontSize(element.fontSize);
        context.font(element.fontFamily, element.fontSize);
        const fillAttributes = extractFillAttributes(element);
        context.fillColor(fillAttributes.fill);
        context.fillOpacity(fillAttributes["fill-opacity"] ?? 1);
        context.text(element.text, element.x, element.y, {
            lineBreak: false,
            baseline: "alphabetic",
            features: element.fontFeatureSettings as any[] | undefined
        });
        this.visitChildren(element, context);
    }

    override visitCanvas(element: Canvas, context: PDFKit.PDFDocument): void {
        context.save();
        context.translate(element.dx, element.dy);
        this.visitChildren(element, context);
        context.restore();
    }

    override visitCanvasElement(element: SimplifiedCanvasElement, context: PDFKit.PDFDocument): void {
        context.save();
        context.translate(element.pos.x, element.pos.y);
        context.rotate(element.rotation);
        this.visitChildren(element, context);
        context.restore();
    }

    /**
     * Checks if either fill or stroke is defined
     *
     * @param element the element to check
     * @returns true if either fill or stroke is defined
     */
    private isShapeVisible(element: Readonly<Shape>): boolean {
        return element.fill != undefined || element.stroke != undefined;
    }

    /**
     * Draws a shape, including fill and stroke
     *
     * @param context the document to use
     * @param styles the styles of the shape
     * @param element the shape to draw
     */
    private drawShape(context: PDFKit.PDFDocument, styles: ShapeStyleAttributes, element: Shape): void {
        if (styles.fill !== "none") {
            context.fillOpacity(styles["fill-opacity"] ?? 1);
        }
        if (element.stroke) {
            const stroke = element.stroke;
            context.strokeOpacity(styles["stroke-opacity"] ?? 1);
            context.lineWidth(styles["stroke-width"] as number);
            if (stroke.dash != undefined) {
                context.dash(stroke.dash, { space: stroke.dashSpace ?? stroke.dash! });
            } else {
                context.undash();
            }
            context.lineJoin(stroke.lineJoin);
            context.lineCap(stroke.lineCap);
            context.miterLimit(stroke.miterLimit);
        }
        const fill = styles.fill === "none" ? undefined : styles.fill;
        const stroke = styles.stroke === "none" ? undefined : styles.stroke;
        if (fill != undefined && stroke != undefined) {
            context.fillAndStroke(fill, stroke);
        } else if (fill != undefined) {
            context.fill(fill);
        } else if (stroke != undefined) {
            context.stroke(stroke);
        }
    }

    /**
     * Visits the children of the given element
     *
     * @param element the element to visit the children of
     * @param context the document to use
     */
    private visitChildren(element: Element, context: PDFKit.PDFDocument): void {
        element.children.forEach((child) => this.visitElement(child, context));
    }
}
