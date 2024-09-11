import { Point } from "../../../common/point.js";
import { Element } from "../base/element.js";
import { SizedElement } from "../base/sizedElement.js";

/**
 * Marker which can be placed at the start or end of a CanvasConnection
 * The marker is layouted in a way that the center of the right side of
 * the marker is located where the line would regularly start or end.
 * Depending on the lineStart value, the line then actually starts at some point on the horizontal center line of the marker.
 */
export interface Marker extends SizedElement {
    type: typeof Marker.TYPE;
    /**
     * The position on the horizontal center line where the line actually starts.
     * E.g. 1 meaning the line starts at the left edge of the marker, thus the line is shortend by the width of the marker,
     * while 0 means the line starts at the right edge of the marker, thus the line not being shortened at all.
     */
    lineStart: number;
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
