import { Point } from "../../../common/point.js";
import { Element } from "../base/element.js";
import { Marker, MarkerLayoutInformation } from "./marker.js";
import { Math2D } from "../../../common/math.js";

/**
 * Connection line segment
 */

export interface CanvasConnectionSegment extends Element {
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
export function calculateMarkerRenderInformationInternal(
    pos: Point,
    helperPos: Point,
    marker: Marker
): MarkerLayoutInformation {
    if (Point.equals(pos, helperPos)) {
        return {
            rotation: 0,
            newPosition: pos,
            marker,
            position: pos
        };
    }
    const markerWidth = marker.width * marker.lineStart;
    const rotation = (Math.atan2(pos.y - helperPos.y, pos.x - helperPos.x) * 180) / Math.PI;
    const normalizedDelta = Math2D.normalize(Math2D.sub(helperPos, pos));
    const newPoint = Math2D.add(pos, Math2D.scale(normalizedDelta, markerWidth));
    return {
        rotation,
        newPosition: newPoint,
        marker,
        position: pos
    };
}
