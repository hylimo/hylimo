import { Element } from "../base/element";

/**
 * Connection on a Canvas with an arbitrary amount of segments
 * Must only have CanvasConnectionSegment
 */
export interface CanvasConnection extends Element {
    type: typeof CanvasConnection.TYPE;
}

export namespace CanvasConnection {
    /**
     * Type associated with CanvasConnection
     */
    export const TYPE = "canvasConnection";

    /**
     * Checks if an element is a CanvasConnection
     * @param value
     * @returns
     */
    export function isCanvasConnection(value: Element): value is CanvasConnection {
        return value.type === TYPE;
    }

    /**
     * Gets the dependencies required for layouting
     * @param element the element to get the dependencies of
     * @returns the list of dependencies, may contain duplicates
     */
    export function getDependencies(element: CanvasConnection): string[] {
        return element.children.flatMap((segment) => {
            if (CanvasLineSegment.isCanvasLineSegment(segment)) {
                return CanvasLineSegment.getDependencies(segment);
            } else if (CanvasBezierSegment.isCanvasBezierSegment(segment)) {
                return CanvasBezierSegment.getDependencies(segment);
            } else {
                throw new Error(`Unknown CanvasConnectionSegment: ${segment.type}`);
            }
        });
    }
}

/**
 * Connection line segment
 */
export interface CanvasConnectionSegment extends Element {
    /**
     * The type of the segment
     */
    type: typeof CanvasLineSegment.TYPE | typeof CanvasBezierSegment.TYPE;
    /**
     * The id of the start point
     */
    start: string;
    /**
     * The id of the end point
     */
    end: string;
}

/**
 * Direct line connection segment
 */
export interface CanvasLineSegment extends CanvasConnectionSegment {
    type: typeof CanvasLineSegment.TYPE;
}

export namespace CanvasLineSegment {
    /**
     * Type associated with CanvasLineSegment
     */
    export const TYPE = "canvasLineSegment";

    /**
     * Checks if an element is a CanvasLineSegment
     * @param value
     * @returns
     */
    export function isCanvasLineSegment(value: Element): value is CanvasLineSegment {
        return value.type === TYPE;
    }

    /**
     * Gets the dependencies required for layouting
     * @param element the element to get the dependencies of
     * @returns the list of dependencies, may contain duplicates
     */
    export function getDependencies(element: CanvasLineSegment): string[] {
        return [element.start, element.end];
    }
}

/**
 * Cubic bezier connection segment
 */
export interface CanvasBezierSegment extends CanvasConnectionSegment {
    type: typeof CanvasBezierSegment.TYPE;
    /**
     * The id of the start control point
     */
    startControlPoint: string;
    /**
     * The id of the end control point
     */
    endControlPoint: string;
}

export namespace CanvasBezierSegment {
    /**
     * Type associated with CanvasBezierSegment
     */
    export const TYPE = "canvasBezierSegment";

    /**
     * Checks if an element is a CanvasBezierSegment
     * @param value
     * @returns
     */
    export function isCanvasBezierSegment(value: Element): value is CanvasBezierSegment {
        return value.type === TYPE;
    }

    /**
     * Gets the dependencies required for layouting
     * @param element the element to get the dependencies of
     * @returns the list of dependencies, may contain duplicates
     */
    export function getDependencies(element: CanvasBezierSegment): string[] {
        return [element.start, element.end, element.startControlPoint, element.endControlPoint];
    }
}
