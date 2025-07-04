import type { CanvasConnectionSegment } from "./canvasConnectionSegment.js";
import { calculateMarkerRenderInformationInternal } from "./canvasConnectionSegment.js";
import type { Element } from "../base/element.js";
import type { Marker, MarkerLayoutInformation } from "./marker.js";
import type { Point } from "../../../common/point.js";

/**
 * Axis aligned connection segment, consiting of a vertical and one or two horizontal segments.
 */
export interface CanvasAxisAlignedSegment extends CanvasConnectionSegment {
    type: typeof CanvasAxisAlignedSegment.TYPE;
    /**
     * Values betweeen 0 and 1:
     * The position on the x-axis where the vertical segment starts.
     * 0 being the start of the horizontal segment and 1 being the end.
     * Values between -1 and 0:
     * The position on the y-axis where the horizontal segment starts.
     * 0 being the end of the vertical segment and -1 being the start
     */
    pos: number;
}

export namespace CanvasAxisAlignedSegment {
    /**
     * Type associated with CanvasAxisAlignedSegment
     */
    export const TYPE = "canvasAxisAlignedSegment";

    /**
     * Epsilon value for floating point comparisons to avoid
     * markers being rotated in a direction of a very small segment
     */
    const MARKER_EPSILON = 10 ** -6;

    /**
     * Checks if an element is a CanvasAxisAlignedSegment
     *
     * @param value the element to check
     * @returns true if the element is a CanvasAxisAlignedSegment
     */
    export function isCanvasAxisAlignedSegment(value: Element): value is CanvasAxisAlignedSegment {
        return value.type === TYPE;
    }

    /**
     * Gets the dependencies required for layouting
     *
     * @param element the element to get the dependencies of
     * @returns the list of dependencies, may contain duplicates
     */
    export function getDependencies(element: CanvasAxisAlignedSegment): string[] {
        return [element.end];
    }

    /**
     * Calculates the MarkerRenderInformation based on the two points of the line and the size of the marker
     *
     * @param point the position of the end with the marker
     * @param endPoint the end point of the axis aligned segment
     * @param pos the pos of the segment
     * @param marker the marker to render
     */
    export function calculateMarkerRenderInformation(
        point: Point,
        endPoint: Point,
        pos: number,
        marker: Marker
    ): MarkerLayoutInformation {
        let helperPos: Point;
        if (pos > -1 && pos <= 0) {
            if (
                Math.abs(point.y - endPoint.y) < MARKER_EPSILON &&
                Math.abs((point.y - endPoint.y) / (point.x - endPoint.x)) < MARKER_EPSILON
            ) {
                helperPos = { x: endPoint.x, y: point.y };
            } else {
                helperPos = { x: point.x, y: endPoint.y };
            }
        } else {
            if (
                Math.abs(point.x - endPoint.x) < MARKER_EPSILON &&
                Math.abs((point.x - endPoint.x) / (point.y - endPoint.y)) < MARKER_EPSILON
            ) {
                helperPos = { x: point.x, y: endPoint.y };
            } else {
                helperPos = { x: endPoint.x, y: point.y };
            }
        }
        return calculateMarkerRenderInformationInternal(point, helperPos, marker);
    }
}
