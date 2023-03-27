import { FontCollection, FontManager } from "@hylimo/diagram";
import {
    Canvas,
    Element,
    Path,
    Rect,
    Root,
    SimplifiedCanvasElement,
    SimplifiedDiagramVisitor,
    Text,
    WithBounds
} from "@hylimo/diagram-common";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { extractOutlinedShapeAttributes, extractShapeAttributes } from "@hylimo/diagram-render-svg";

/**
 * Renderer which renders a diagram to pdf
 */
export class PDFRenderer {
    /**
     * Creates a new svg renderer
     *
     * @param margin the margin to apply to the bounding box
     */
    constructor(private readonly fontManager: FontManager = new FontManager(), private readonly margin = 10) {}

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
                const fontCollection = new FontCollection(fontFamilies);
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

    override visitRoot(element: WithBounds<Root>, context: PDFKit.PDFDocument): void {
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

    override visitRect(element: WithBounds<Rect>, context: PDFKit.PDFDocument): void {
        const shapeAttributes = extractOutlinedShapeAttributes(element);
        if (element.cornerRadius) {
            const radius = Math.min(
                element.cornerRadius,
                element.bounds.size.width / 2,
                element.bounds.size.height / 2
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
        this.drawShape(context, shapeAttributes);
        this.visitChildren(element, context);
    }

    override visitPath(element: WithBounds<Path>, context: PDFKit.PDFDocument): void {
        const shapeAttributes = extractShapeAttributes(element);
        context.save();
        context.translate(element.x, element.y);
        context.path(element.path);
        context.lineJoin(element.lineJoin);
        context.lineCap(element.lineCap);
        context.miterLimit(element.miterLimit);
        this.drawShape(context, shapeAttributes);
        context.restore();
    }

    override visitText(element: WithBounds<Text>, context: PDFKit.PDFDocument): void {
        const font = this.fontCollection.getFont(element.fontFamily, element.fontWeight, element.fontStyle);
        const scalingFactor = element.fontSize / font.unitsPerEm;
        const glyphRun = font.layout(element.text);
        context.save();
        context.translate(element.x, element.y);
        context.scale(scalingFactor, -scalingFactor);
        for (const glyph of glyphRun.glyphs) {
            const path = glyph.path.toSVG();
            context.path(path).fill(element.fill);
            context.translate(glyph.advanceWidth, 0);
        }
        context.restore();
    }

    override visitCanvas(element: WithBounds<Canvas>, context: PDFKit.PDFDocument): void {
        this.visitChildren(element, context);
    }

    override visitCanvasElement(element: WithBounds<SimplifiedCanvasElement>, context: PDFKit.PDFDocument): void {
        context.save();
        context.translate(element.pos.x, element.pos.y);
        context.rotate(element.rotation);
        this.visitChildren(element, context);
        context.restore();
    }

    /**
     * Draws a shape, including fill and stroke
     *
     * @param context the document to use
     * @param styles the styles of the shape
     */
    private drawShape(context: PDFKit.PDFDocument, styles: ReturnType<typeof extractShapeAttributes>): void {
        if (styles.fill !== "none" && styles["fill-opacity"] !== false) {
            context.fillOpacity(styles["fill-opacity"]);
        }
        if (styles.stroke) {
            if (styles["stroke-opacity"] !== false) {
                context.strokeOpacity(styles["stroke-opacity"]);
            }
            if (styles["stroke-width"] !== false) {
                context.lineWidth(styles["stroke-width"]);
            }
        }
        const fill = styles.fill === "none" ? undefined : styles.fill;
        const stroke = styles.stroke || undefined;
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
