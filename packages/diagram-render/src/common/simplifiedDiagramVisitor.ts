import {
    Canvas,
    CanvasConnection,
    CanvasElement,
    CanvasLayoutEngine,
    CanvasPoint,
    Element,
    LineCap,
    LineJoin,
    Marker,
    MarkerLayoutInformation,
    Path,
    Point,
    Rect,
    Root,
    Text
} from "@hylimo/diagram-common";
import { SimplifiedCanvasElement } from "./simplifiedTypes";

/**
 * Visitor which simplifies the provided diagram model on the fly, and visists each element
 */
export abstract class SimplifiedDiagramVisitor<C, O> {
    /**
     * Counter used to generated new ids
     */
    private idCounter = 0;

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
                return this.visitCanvas(this.simplifyCanvas(element as Canvas), context);
            case CanvasElement.TYPE:
                return this.visitCanvasElement(element as SimplifiedCanvasElement, context);
            default:
                throw new Error(`Unknown element type: ${element.type}`);
        }
    }

    /**
     * Simplifies a canvas and its children
     *
     * @param canvas the canvas to simplify
     * @returns the simplified canvas
     */
    private simplifyCanvas(canvas: Canvas): Canvas {
        const layoutEngine = new SimpleCanvasLayoutEngine(canvas.children);
        return {
            ...canvas,
            children: canvas.children.flatMap((child) => {
                if (CanvasElement.isCanvasElement(child)) {
                    return this.simplifyCanvasElement(child, layoutEngine);
                } else if (CanvasConnection.isCanvasConnection(child)) {
                    return this.simplifyCanvasConnection(child, layoutEngine);
                } else {
                    return [];
                }
            })
        };
    }

    /**
     * Simplifies a canvas element using the given layout engine of its parent canvas
     *
     * @param element the element to simplify
     * @param layoutEngine the layout engine of the parent canvas
     * @returns the simplified canvas element
     */
    private simplifyCanvasElement(element: CanvasElement, layoutEngine: CanvasLayoutEngine): SimplifiedCanvasElement {
        return {
            ...element,
            pos: layoutEngine.getPoint(element.id)
        };
    }

    /**
     * Simplifies a canvas connection by transforming it to a canvas element with a path, and canvas elements for both markers
     * 
     * @param connection the connection to simplify
     * @param layoutEngine the layout engine of the parent canvas
     * @returns the simplified canvas element
     */
    private simplifyCanvasConnection(
        connection: CanvasConnection,
        layoutEngine: CanvasLayoutEngine
    ): SimplifiedCanvasElement[] {
        const elements: SimplifiedCanvasElement[] = [];
        const layout = layoutEngine.layoutConnection(connection);
        const defaultSizeAndPos = { x: 0, y: 0, width: 0, height: 0 };
        const connectionPath: Path = {
            ...connection,
            type: Path.TYPE,
            id: connection.id,
            path: layout.path,
            children: [],
            miterLimit: 0,
            lineCap: LineCap.Butt,
            lineJoin: LineJoin.Miter,
            ...defaultSizeAndPos
        };
        elements.push({
            type: CanvasElement.TYPE,
            ...defaultSizeAndPos,
            rotation: 0,
            pos: Point.ORIGIN,
            id: `simplified_${this.idCounter++}`,
            children: [connectionPath]
        });
        if (layout.startMarker != undefined) {
            elements.push(this.simplifyMarker(layout.startMarker));
        }
        return elements;
    }

    /**
     * Simplifies a marker by converting it to a canvas element
     *
     * @param layout the marker layout
     * @returns the simplified marker
     */
    private simplifyMarker(layout: MarkerLayoutInformation): SimplifiedCanvasElement {
        const marker = layout.marker;
        return {
            type: CanvasElement.TYPE,
            id: marker.id,
            x: -marker.width,
            y: -marker.height / 2,
            width: marker.width,
            height: marker.height,
            rotation: layout.rotation,
            children: marker.children,
            pos: layout.position
        };
    }

    abstract visitRoot(element: Root, context: C): O;
    abstract visitRect(element: Rect, context: C): O;
    abstract visitPath(element: Path, context: C): O;
    abstract visitText(element: Text, context: C): O;
    abstract visitCanvas(element: Canvas, context: C): O;
    abstract visitCanvasElement(element: SimplifiedCanvasElement, context: C): O;
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
