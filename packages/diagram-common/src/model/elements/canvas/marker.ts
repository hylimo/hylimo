import type { Point } from "../../../common/point.js";
import type { Element } from "../base/element.js";
import type { SizedElement } from "../base/sizedElement.js";

/**
 * Marker which can be placed at the start or end of a CanvasConnection
 * The marker is layouted in a way that the center of the right side of
 * the marker is located where the line would regularly start or end.
 * Depending on the lineStart value, the line then actually starts at some point on the horizontal center line of the marker.
 */
export interface Marker extends SizedElement {
    type: typeof Marker.TYPE;
    /**
     * The position on the horizontal line to the reference point where the line actually starts.
     * Assuming a reference point of (1, 0.5):
     * E.g. 0 meaning the line starts at the left edge of the marker, thus the line is shortend by the width of the marker,
     * while 1 means the line starts at the right edge of the marker, thus the line not being shortened at all.
     */
    lineStart: number;
    /**
     * The x coordinate of the reference point
     * Used to align the marker with the end of the line
     * Range: [0, 1], 0 meaning the left edge of the marker, 1 meaning the right edge of the marker
     */
    refX: number;
    /**
     * The y coordinate of the reference point
     * Used to align the marker with the end of the line
     * Range: [0, 1], 0 meaning the top edge of the marker, 1 meaning the bottom edge of the marker
     */
    refY: number;
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
     *
     * @param value the element to check
     * @returns true if the element is a Marker
     */
    export function isMarker(value: Element): value is Marker {
        return value.type === TYPE;
    }

    /**
     * Calculates the effective width of the marker, meaning the length the line is offset by the marker
     *
     * @param marker the marker to calculate the width for
     * @returns the effective width of the marker
     */
    export function markerWidth(marker: Marker): number {
        return marker.width * (1 - marker.lineStart) * marker.refX;
    }
}
/**
 * Information required to layout a CanvasConnectionSegment with a marker
 */
export interface MarkerLayoutInformation {
    /**
     * The actual marker
     */
    marker: Marker;
    /**
     * The new point to layout the CanvasConnectionSegment
     */
    newPosition: Point;
    /**
     * The position of the marker
     */
    position: Point;
    /**
     * The rotation in degrees (0-360)
     */
    rotation: number;
}
