import { CanvasLayoutEngine } from "../../canvas/canvasLayoutEngine.js";
import { Canvas } from "../elements/canvas/canvas.js";
import { CanvasElement } from "../elements/canvas/canvasElement.js";
import { MarkerLayoutInformation } from "../elements/canvas/marker.js";
import { Path } from "../elements/path.js";
import { Rect } from "../elements/rect.js";
import { Root } from "../elements/root.js";
import { SimplifiedCanvasElement, WithBounds } from "./simplifiedTypes.js";
import { Element } from "../elements/base/element.js";
import { Text } from "../elements/text.js";
import { CanvasConnection } from "../elements/canvas/canvasConnection.js";
import { CanvasPoint } from "../elements/canvas/canvasPoint.js";
import { Point } from "../../common/point.js";
import { LayoutedElement } from "../elements/base/layoutedElement.js";
import { Math2D } from "../../common/math.js";
import { Bounds } from "../../common/bounds.js";
import { svgPathBbox } from "../../bounds/svgPathBbox.js";
import { CanvasConnectionLayout } from "../../canvas/canvasConnectionLayout.js";
import { Ellipse } from "../elements/ellipse.js";

/**
 * Visitor which simplifies the provided diagram model, and visists each element
 */
export abstract class SimplifiedDiagramVisitor<C, O> {
    /**
     * Counter used to generated new ids
     */
    private idCounter = 0;

    /**
     * Visists the provided diagram
     *
     * @param element the root element of the diagram to visit
     * @param context the context to pass to the visitor
     * @returns the result of the visit
     */
    visit(element: Root, context: C): O {
        return this.visitElement(this.simplify(element), context);
    }

    /**
     * Simplifies an element and its children.
     * Especially, simplifies a canvas and calculates the bounds of each element
     *
     * @param element the element to simplify
     * @returns the simplified element
     */
    private simplify(element: Element): WithBounds<Element> {
        switch (element.type) {
            case Root.TYPE: {
                const children = element.children.map(this.simplify.bind(this));
                return {
                    ...element,
                    children,
                    bounds: Math2D.mergeBounds(...children.map((child) => child.bounds))
                };
            }
            case Rect.TYPE:
            case Path.TYPE:
            case Text.TYPE:
            case Ellipse.TYPE:
                return this.simplifyLayoutedElement(element as LayoutedElement);
            case Canvas.TYPE:
                return this.simplifyCanvas(element as Canvas);
            default:
                throw new Error(`Unknown element type: ${element.type}`);
        }
    }

    /**
     * Simplifies a layouted element.
     * Sets the bounds already present.
     *
     * @param element the element to simplify
     * @returns the simplified element
     */
    private simplifyLayoutedElement(element: LayoutedElement): WithBounds<LayoutedElement> {
        return {
            ...element,
            bounds: {
                position: {
                    x: element.x,
                    y: element.y
                },
                size: {
                    width: element.width,
                    height: element.height
                }
            },
            children: element.children.map(this.simplify.bind(this))
        };
    }

    /**
     * Visits an element and calls the appropriate visit method
     *
     * @param element the element to visit
     * @param context the context to pass to the visit method
     * @returns the result of the visit method
     */
    protected visitElement(element: Element, context: C): O {
        switch (element.type) {
            case Root.TYPE:
                return this.visitRoot(element as WithBounds<Root>, context);
            case Rect.TYPE:
                return this.visitRect(element as WithBounds<Rect>, context);
            case Ellipse.TYPE:
                return this.visitEllipse(element as WithBounds<Ellipse>, context);
            case Path.TYPE:
                return this.visitPath(element as WithBounds<Path>, context);
            case Text.TYPE:
                return this.visitText(element as WithBounds<Text>, context);
            case Canvas.TYPE:
                return this.visitCanvas(element as WithBounds<Canvas>, context);
            case CanvasElement.TYPE:
                return this.visitCanvasElement(element as WithBounds<SimplifiedCanvasElement>, context);
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
    private simplifyCanvas(canvas: Canvas): WithBounds<Canvas> {
        const layoutEngine = new SimpleCanvasLayoutEngine(canvas.children);
        const children = canvas.children.flatMap((child) => {
            if (CanvasElement.isCanvasElement(child)) {
                return this.simplifyCanvasElement(child, layoutEngine);
            } else if (CanvasConnection.isCanvasConnection(child)) {
                return this.simplifyCanvasConnection(child, layoutEngine);
            } else {
                return [];
            }
        });
        return {
            ...canvas,
            children,
            bounds: Math2D.mergeBounds(...children.map((child) => child.bounds))
        };
    }

    /**
     * Simplifies a canvas element using the given layout engine of its parent canvas
     *
     * @param element the element to simplify
     * @param layoutEngine the layout engine of the parent canvas
     * @returns the simplified canvas element
     */
    private simplifyCanvasElement(
        element: CanvasElement,
        layoutEngine: CanvasLayoutEngine
    ): WithBounds<SimplifiedCanvasElement> {
        const pos = layoutEngine.getPoint(element.id);
        return {
            ...element,
            children: element.children.map(this.simplify.bind(this)),
            pos,
            bounds: this.calculateCanvasElementBounds(
                pos,
                element.rotation,
                element.x,
                element.y,
                element.width,
                element.height
            )
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
    ): WithBounds<SimplifiedCanvasElement>[] {
        const elements: WithBounds<SimplifiedCanvasElement>[] = [];
        const layout = layoutEngine.layoutConnection(connection);
        const defaultSizeAndPos = { x: 0, y: 0, width: 0, height: 0 };
        const connectionPath: WithBounds<Path> = {
            ...connection,
            type: Path.TYPE,
            id: connection.id,
            path: layout.path,
            children: [],
            ...defaultSizeAndPos,
            bounds: this.calculateConnectionBounds(connection, layout)
        };
        elements.push({
            type: CanvasElement.TYPE,
            ...defaultSizeAndPos,
            rotation: 0,
            pos: Point.ORIGIN,
            id: `simplified_${this.idCounter++}`,
            children: [connectionPath],
            bounds: connectionPath.bounds
        });
        if (layout.startMarker != undefined) {
            elements.push(this.simplifyMarker(layout.startMarker));
        }
        if (layout.endMarker != undefined) {
            elements.push(this.simplifyMarker(layout.endMarker));
        }
        return elements;
    }

    /**
     * Calculates the bounds for the given connection
     *
     * @param connection the connection to calculate the bounds for
     * @param layout the layout of the connection
     * @returns the bounds of the connection
     */
    private calculateConnectionBounds(connection: CanvasConnection, layout: CanvasConnectionLayout): Bounds {
        const pathBounds = svgPathBbox(layout.path, connection.stroke);
        return {
            position: {
                x: pathBounds.x - pathBounds.overflow.left,
                y: pathBounds.y - pathBounds.overflow.top
            },
            size: {
                width: pathBounds.width + pathBounds.overflow.left + pathBounds.overflow.right,
                height: pathBounds.height + pathBounds.overflow.top + pathBounds.overflow.bottom
            }
        };
    }

    /**
     * Simplifies a marker by converting it to a canvas element
     *
     * @param layout the marker layout
     * @returns the simplified marker
     */
    private simplifyMarker(layout: MarkerLayoutInformation): WithBounds<SimplifiedCanvasElement> {
        const marker = layout.marker;
        const x = -marker.width;
        const y = -marker.height / 2;
        return {
            type: CanvasElement.TYPE,
            id: marker.id,
            x,
            y,
            width: marker.width,
            height: marker.height,
            rotation: layout.rotation,
            children: marker.children.map(this.simplify.bind(this)),
            pos: layout.position,
            bounds: this.calculateCanvasElementBounds(
                layout.position,
                layout.rotation,
                x,
                y,
                marker.width,
                marker.height
            )
        };
    }

    /**
     * Calculates the bounds of a CanvasElement
     *
     * @param pos the position of the element
     * @param rotation the rotation of the element
     * @param x the relative x position in the roated coordinate system
     * @param y the relative y position in the roated coordinate system
     * @param width the width of the element
     * @param height the height of the element
     * @returns the bounds of the element
     */
    private calculateCanvasElementBounds(
        pos: Point,
        rotation: number,
        x: number,
        y: number,
        width: number,
        height: number
    ): Bounds {
        const bounds = Math2D.rotateBounds({ position: { x, y }, size: { width, height } }, (rotation * Math.PI) / 180);
        return {
            position: {
                x: bounds.position.x + pos.x,
                y: bounds.position.y + pos.y
            },
            size: bounds.size
        };
    }

    abstract visitRoot(element: WithBounds<Root>, context: C): O;
    abstract visitRect(element: WithBounds<Rect>, context: C): O;
    abstract visitEllipse(element: WithBounds<Ellipse>, context: C): O;
    abstract visitPath(element: WithBounds<Path>, context: C): O;
    abstract visitText(element: WithBounds<Text>, context: C): O;
    abstract visitCanvas(element: WithBounds<Canvas>, context: C): O;
    abstract visitCanvasElement(element: WithBounds<SimplifiedCanvasElement>, context: C): O;
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
