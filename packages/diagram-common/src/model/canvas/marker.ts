import { Point } from "../../common/point";
import { Size } from "../../common/size";
import { Element } from "../base/element";
import { SizedElement } from "../base/sizedElement";

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
    type: typeof Marker.TYPE;
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
     * The new point to layout the CanvasConnectionSegment
     */
    newPoint: Point;
    /**
     * The rotation in degrees (0-360)
     */
    rotation: number;
}
