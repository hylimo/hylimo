import { CanvasLayoutEngine } from "../../canvas/canvasLayoutEngine.js";
import { Canvas } from "../elements/canvas/canvas.js";
import { CanvasElement } from "../elements/canvas/canvasElement.js";
import { MarkerLayoutInformation } from "../elements/canvas/marker.js";
import { Path } from "../elements/path.js";
import { Rect } from "../elements/rect.js";
import { Root } from "../elements/root.js";
import { SimplifiedCanvasElement, SimplifiedText } from "./simplifiedTypes.js";
import { Element } from "../elements/base/element.js";
import { TextLine, Text } from "../elements/text.js";
import { CanvasConnection } from "../elements/canvas/canvasConnection.js";
import { Point } from "../../common/point.js";
import { LayoutedElement } from "../elements/base/layoutedElement.js";
import { Ellipse } from "../elements/ellipse.js";
import { LineCap, LineJoin } from "../elements/base/colored.js";

/**
 * Helper class to simplify a diagram.
 * A simplified diagram is a diagram where the canvas layout is evaluated,
 * connections and markers are converted to canvas elements,
 * and all canvas points are removed.
 */
export class DiagramSimplifier {
    /**
     * Counter used to generated new ids
     */
    private idCounter = 0;

    /**
     * Layout engine to simplify canvas elements
     */
    private readonly layoutEngine: SimpleCanvasLayoutEngine;

    /**
     * Creates a new DiagramSimplifier
     *
     * @param root the root element of the diagram to simplify
     */
    constructor(root: Root) {
        this.layoutEngine = new SimpleCanvasLayoutEngine(root);
    }

    /**
     * Simplifies an element and its children.
     * Especially, simplifies a canvas and calculates the bounds of each element
     *
     * @param element the element to simplify
     * @returns the simplified element
     */
    simplify(element: Element): Element {
        switch (element.type) {
            case Root.TYPE: {
                const children = element.children.map(this.simplify.bind(this));
                return {
                    ...element,
                    children
                };
            }
            case Rect.TYPE:
            case Path.TYPE:
            case Ellipse.TYPE:
                return this.simplifyLayoutedElement(element as LayoutedElement);
            case Canvas.TYPE:
                return this.simplifyCanvas(element as Canvas);
            case Text.TYPE:
                return this.simplifyText(element as Text);
            default:
                throw new Error(`Unknown element type: ${element.type}`);
        }
    }

    /**
     * Simplifies a layouted element by simplifying its children.
     *
     * @param element the element to simplify
     * @returns the simplified element
     */
    private simplifyLayoutedElement(element: LayoutedElement): LayoutedElement {
        return {
            ...element,
            children: element.children.map(this.simplify.bind(this))
        };
    }

    /**
     * Simplifies a canvas and its children
     *
     * @param canvas the canvas to simplify
     * @returns the simplified canvas
     */
    private simplifyCanvas(canvas: Canvas): Canvas {
        const children = canvas.children.flatMap((child) => {
            if (CanvasElement.isCanvasElement(child)) {
                return this.simplifyCanvasElement(child);
            } else if (CanvasConnection.isCanvasConnection(child)) {
                return this.simplifyCanvasConnection(child);
            } else {
                return [];
            }
        });
        return {
            ...canvas,
            children
        };
    }

    /**
     * Simplifies a canvas element using the given layout engine of its parent canvas
     *
     * @param element the element to simplify
     * @returns the simplified canvas element
     */
    private simplifyCanvasElement(element: CanvasElement): SimplifiedCanvasElement {
        const pos = this.layoutEngine.layoutElement(element);
        return {
            ...element,
            children: element.children.map(this.simplify.bind(this)),
            pos
        };
    }

    /**
     * Simplifies a canvas connection by transforming it to a canvas element with a path, and canvas elements for both markers
     *
     * @param connection the connection to simplify
     * @returns the simplified canvas element
     */
    private simplifyCanvasConnection(connection: CanvasConnection): SimplifiedCanvasElement[] {
        const elements: SimplifiedCanvasElement[] = [];
        const layout = this.layoutEngine.layoutConnection(connection);
        const defaultSizeAndPos = { x: 0, y: 0, width: 0, height: 0 };
        const connectionPath: Path = {
            ...connection,
            type: Path.TYPE,
            id: connection.id,
            path: layout.path,
            children: [],
            ...defaultSizeAndPos
        };
        elements.push({
            type: CanvasElement.TYPE,
            ...defaultSizeAndPos,
            rotation: 0,
            pos: Point.ORIGIN,
            id: `simplified_${this.idCounter++}`,
            children: [connectionPath],
            edits: {}
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
            width: marker.width,
            height: marker.height,
            rotation: layout.rotation,
            children: marker.children.map(this.simplify.bind(this)),
            pos: layout.position,
            edits: {}
        };
    }

    /**
     * Simplifies a text element by converting the underline and strikethrough to paths
     *
     * @param text the text element to simplify
     * @returns the simplified text element
     */
    private simplifyText(text: Text): SimplifiedText {
        const children = text.children.map(this.simplify.bind(this));
        if (text.underline != undefined) {
            children.push(this.convertTextLineToPath(text, text.underline));
        }
        if (text.strikethrough != undefined) {
            children.push(this.convertTextLineToPath(text, text.strikethrough));
        }
        return {
            ...text,
            children
        };
    }

    /**
     * Simplifies a text line (underline or strikethrough) by converting it to a path
     *
     * @param text the text element containing the line
     * @param line the line to convert
     * @returns the simplified path
     */
    private convertTextLineToPath(text: Text, line: TextLine): Path {
        return {
            type: Path.TYPE,
            id: `simplified_${this.idCounter++}`,
            x: text.x,
            y: text.y,
            width: text.width,
            height: text.height,
            children: [],
            edits: {},
            path: `M 0 ${line.y} L ${text.width} ${line.y}`,
            stroke: {
                ...line,
                lineJoin: LineJoin.Bevel,
                lineCap: LineCap.Butt,
                miterLimit: 1
            }
        };
    }
}

/**
 * Visitor which simplifies the provided diagram model, and visists each element
 */
export abstract class SimplifiedDiagramVisitor<C, O> {
    /**
     * Visists the provided diagram
     *
     * @param element the root element of the diagram to visit
     * @param context the context to pass to the visitor
     * @returns the result of the visit
     */
    visit(element: Root, context: C): O {
        const simplifier = new DiagramSimplifier(element);
        return this.visitElement(simplifier.simplify(element), context);
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
                return this.visitRoot(element as Root, context);
            case Rect.TYPE:
                return this.visitRect(element as Rect, context);
            case Ellipse.TYPE:
                return this.visitEllipse(element as Ellipse, context);
            case Path.TYPE:
                return this.visitPath(element as Path, context);
            case Text.TYPE:
                return this.visitText(element as Text, context);
            case Canvas.TYPE:
                return this.visitCanvas(element as Canvas, context);
            case CanvasElement.TYPE:
                return this.visitCanvasElement(element as SimplifiedCanvasElement, context);
            default:
                throw new Error(`Unknown element type: ${element.type}`);
        }
    }

    abstract visitRoot(element: Root, context: C): O;
    abstract visitRect(element: Rect, context: C): O;
    abstract visitEllipse(element: Ellipse, context: C): O;
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
    /**
     * Lookup for elements by id
     */
    private readonly elementLookup = new Map<string, Element>();

    /**
     * Lookup for parent elements by id
     */
    private readonly parentLookup = new Map<string, string>();

    /**
     * Creates a new CanvasLayoutEngine based on the given root element
     *
     * @param root the root element of the diagram
     */
    constructor(root: Root) {
        super();
        this.elementLookup.set(root.id, root);
        this.registerChildren(root);
    }

    /**
     * Registers the children of the given element
     *
     * @param element the element to register the children for
     */
    private registerChildren(element: Element) {
        for (const child of element.children) {
            this.elementLookup.set(child.id, child);
            this.parentLookup.set(child.id, element.id);
            this.registerChildren(child);
        }
    }

    override getElement(id: string): Element {
        return this.elementLookup.get(id)!;
    }

    override getParentElement(element: string): string {
        return this.parentLookup.get(element)!;
    }
}
