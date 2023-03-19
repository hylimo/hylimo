import {
    Canvas,
    CanvasConnection,
    CanvasElement,
    CanvasLayoutEngine,
    CanvasPoint,
    Element,
    Marker,
    Path,
    Rect,
    Root,
    Text
} from "@hylimo/diagram-common";
import { SimplifiedCanvasConnection, SimplifiedCanvasElement } from "./simplifiedTypes";

/**
 * Visitor which simplifies the provided diagram model on the fly, and visists each element
 */
export abstract class SimplifiedDiagramVisitor<C, O> {
    /**
     * Visits an element and calls the appropriate visit method
     *
     * @param element the element to visit
     * @param context the context to pass to the visit method
     * @returns the result of the visit method
     */
    visit(element: Element, context: C): O {
        switch (element.type) {
            case Root.TYPE:
                return this.visitRoot(element as Root, context);
            case Rect.TYPE:
                return this.visitRect(element as Rect, context);
            case Path.TYPE:
                return this.visitPath(element as Path, context);
            case Text.TYPE:
                return this.visitText(element as Text, context);
            case Canvas.TYPE:
                return this.visitCanvas(element as Canvas, context);
            case CanvasElement.TYPE:
                return this.visitCanvasElement(element as SimplifiedCanvasElement, context);
            case CanvasConnection.TYPE:
                return this.visitCanvasConnection(element as SimplifiedCanvasConnection, context);
            case Marker.TYPE:
                return this.visitMarker(element as Marker, context);
            default:
                throw new Error(`Unknown element type: ${element.type}`);
        }
    }

    private simplifyCanvas(canvas: Canvas): Canvas {
        const layoutEngine = new SimpleCanvasLayoutEngine(canvas.children);
        
        throw new Error("TODO");
    }

    abstract visitRoot(element: Root, context: C): O;
    abstract visitRect(element: Rect, context: C): O;
    abstract visitPath(element: Path, context: C): O;
    abstract visitText(element: Text, context: C): O;
    abstract visitCanvas(element: Canvas, context: C): O;
    abstract visitCanvasElement(element: SimplifiedCanvasElement, context: C): O;
    abstract visitCanvasConnection(element: SimplifiedCanvasConnection, context: C): O;
    abstract visitMarker(element: Marker, context: C): O;
}

/**
 * Helper to evaluate a set of points to their position.
 * Also used to layout canas elements
 */
class SimpleCanvasLayoutEngine extends CanvasLayoutEngine {
    private readonly children = new Map<string, Element>();

    /**
     * Creates a new CanvasLayoutEngine based on the given children of a canvas
     *
     * @param children the children of a canvas
     */
    constructor(children: Element[]) {
        super();
        for (const child of children) {
            this.children.set(child.id, child);
        }
    }

    override getElement(id: string): CanvasConnection | CanvasElement | CanvasPoint {
        return this.children.get(id) as CanvasConnection | CanvasElement | CanvasPoint;
    }
}
