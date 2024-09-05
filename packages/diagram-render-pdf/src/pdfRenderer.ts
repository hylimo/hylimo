import { FontCollection, FontManager } from "@hylimo/diagram";
import {
    Canvas,
    Element,
    Ellipse,
    Path,
    Rect,
    Root,
    Shape,
    SimplifiedCanvasElement,
    SimplifiedDiagramVisitor,
    Text,
} from "@hylimo/diagram-common";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import {
    ShapeStyleAttributes,
    extractFillAttributes,
    extractOutlinedShapeAttributes,
    extractShapeStyleAttributes
} from "@hylimo/diagram-render-svg";

/**
 * Renderer which renders a diagram to pdf
 */
export class PDFRenderer {
    /**
     * Creates a new svg renderer
     *
     * @param margin the margin to apply to the bounding box
     */
    constructor(
        private readonly fontManager: FontManager = new FontManager(),
        private readonly margin = 10
    ) {}

    /**
     * Renders the provided root to an svg string
     *
     * @param root the diagram to render
     * @param background the background color
     * @returns the svg string
     */
    async render(root: Root, background: string): Promise<Uint8Array[]> {
        return new Promise(async (resolve, reject) => {
            try {
                const parts: Uint8Array[] = [];
                const fontFamilies = await Promise.all(root.fonts.map((font) => this.fontManager.getFontFamily(font)));
                const fontCollection = new FontCollection(fontFamilies.map((family) => family.fontFamily));
                const document = new PDFDocument({ autoFirstPage: false });
                const visitor = new PDFDiagramVisitor(this.margin, background, fontCollection);
                document.on("data", (data: Uint8Array) => parts.push(data));
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
     * @param fontCollection the font collection to use
     */
    constructor(
        private readonly margin: number,
        private readonly background: string,
        private readonly fontCollection: FontCollection
    ) {
        super();
    }

    override visitRoot(element: Root, context: PDFKit.PDFDocument): void {
        const [width, height] = [
            element.bounds.size.width + 2 * this.margin,
            element.bounds.size.height + 2 * this.margin
        ];
        context.addPage({
            size: [width, height]
        });
        context.rect(0, 0, width, height).fill(this.background);
        context.translate(-element.bounds.position.x + this.margin, -element.bounds.position.y + this.margin);
        this.visitChildren(element, context);
    }

    override visitRect(element: Rect, context: PDFKit.PDFDocument): void {
        if (this.isShapeVisible(element)) {
            const shapeAttributes = extractOutlinedShapeAttributes(element);
            if (element.cornerRadius) {
                const radius = Math.min(
                    element.cornerRadius,
                    element.width / 2,
                    element.height / 2
                );
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

    override visitText(element: Text, context: PDFKit.PDFDocument): void {
        const font = this.fontCollection.getFont(element.fontFamily, element.fontWeight, element.fontStyle);
        const scalingFactor = element.fontSize / font.unitsPerEm;
        const glyphRun = font.layout(element.text);
        const fillAttributes = extractFillAttributes(element);
        context.save();
        context.translate(element.x, element.y);
        context.scale(scalingFactor, -scalingFactor);
        for (const glyph of glyphRun.glyphs) {
            if (!/^\s*$/.test(String.fromCodePoint(...glyph.codePoints)) && element.fill != undefined) {
                const path = glyph.path.toSVG();
                context.path(path);
                context.fillOpacity(fillAttributes["fill-opacity"] ?? 1);
                context.fillColor(fillAttributes.fill);
                context.fill();
            }
            context.translate(glyph.advanceWidth, 0);
        }
        context.restore();
    }

    override visitCanvas(element: Canvas, context: PDFKit.PDFDocument): void {
        this.visitChildren(element, context);
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
            context.fillColor(fill);
            context.fill();
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
