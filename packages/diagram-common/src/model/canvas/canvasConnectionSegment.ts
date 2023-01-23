import { Point } from "../../common/point";
import { Element } from "../base/element";
import { Point as SprottyPoint } from "sprotty-protocol";
import { BaseMarker, MarkerRenderInformation } from "./marker";
import { CanvasBezierSegment } from "./canvasBezierSegment";
import { CanvasLineSegment } from "./canvasLineSegment";

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
export function calculateMarkerRenderInformationInternal(
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
