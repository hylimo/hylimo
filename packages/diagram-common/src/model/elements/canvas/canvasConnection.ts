import { Element } from "../base/element.js";
import { StrokedElement } from "../base/strokedElement.js";
import { CanvasLineSegment } from "./canvasLineSegment.js";
import { CanvasBezierSegment } from "./canvasBezierSegment.js";

/**
 * Connection on a Canvas with an arbitrary amount of segments
 * Must only have CanvasConnectionSegment
 */
export interface CanvasConnection extends StrokedElement {
    type: typeof CanvasConnection.TYPE;
    /**
     * The id of the start point
     */
    start: string;
}

export namespace CanvasConnection {
    /**
     * Type associated with CanvasConnection
     */
    export const TYPE = "canvasConnection";

    /**
     * Checks if an element is a CanvasConnection
     *
     * @param value the element to check
     * @returns true if the element is a CanvasConnection
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
