import { Point } from "../../common/point";
import { Size } from "../../common/size";
import { Element } from "../base/element";
import { LayoutedElement } from "../base/layoutedElement";
import { SizedElement } from "../base/sizedElement";
import { Point as SprottyPoint } from "sprotty-protocol";
import { StrokedElement } from "../base/strokedElement";

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

export interface BaseMarker extends Size {
    /**
     * The position on the vertical center line where the line actually starts
     */
    lineStart: number;
}

/**
 * Marker which can be placed at the start or end of a CanvasConnection
 */
export interface Marker extends SizedElement, BaseMarker {
    /**
     * Is it a start or end marker?
     */
    pos: "start" | "end";
}

export namespace Marker {
    /**
     * Type associated with Marker
     */
    export const TYPE = "marker";

    /**
     * Checks if an element is a Marker
     * @param value
     * @returns
     */
    export function isMarker(value: Element): value is Marker {
        return value.type === TYPE;
    }
}

/**
 * Information required to rendre a CanvasConnectionSegment with a marker
 */
export interface MarkerRenderInformation {
    /**
     * The new point to render the CanvasConnectionSegment
     */
    newPoint: Point;
    /**
     * The rotation in degrees (0-360)
     */
    rotation: number;
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
     * The id of the end point
     */
    end: string;
}

/**
 * Calculates the MarkerRenderInformation based on the two points of the line and the size of the marker
 * Translates the line
 *
 * @param pos the position of the end with the marker
 * @param helperPos helper point to help direct the marker
 * @param marker the marker to render
 */
function calculateMarkerRenderInformationInternal(
    pos: Point,
    helperPos: Point,
    marker: BaseMarker
): MarkerRenderInformation {
    const markerWidth = marker.width * marker.lineStart;
    const rotation = (Math.atan2(pos.y - helperPos.y, pos.x - helperPos.x) * 180) / Math.PI;
    return {
        rotation,
        newPoint: SprottyPoint.shiftTowards(pos, helperPos, markerWidth)
    };
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
        return [element.end];
    }

    /**
     * Calculates the MarkerRenderInformation based on the two points of the line and the size of the marker
     *
     * @param pos the position of the end with the marker
     * @param otherEnd the position of the other end
     * @param marker the marker to render
     */
    export function calculateMarkerRenderInformation(
        pos: Point,
        otherEnd: Point,
        marker: BaseMarker
    ): MarkerRenderInformation {
        return calculateMarkerRenderInformationInternal(pos, otherEnd, marker);
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
        return [element.end, element.startControlPoint, element.endControlPoint];
    }

    /**
     * Calculates the MarkerRenderInformation based on the two points of the line and the size of the marker
     *
     * @param pos the position of the end with the marker
     * @param controlPoint the control point of the end
     * @param marker the marker to render
     */
    export function calculateMarkerRenderInformation(
        pos: Point,
        controlPoint: Point,
        marker: BaseMarker
    ): MarkerRenderInformation {
        return calculateMarkerRenderInformationInternal(pos, controlPoint, marker);
    }
}
