import { Point } from "../common/point.js";
import { LineSegment } from "../line/model/lineSegment.js";
import { Segment } from "../line/model/segment.js";
import { CanvasLineSegment } from "../model/elements/canvas/canvasLineSegment.js";
import { Marker, MarkerLayoutInformation } from "../model/elements/canvas/marker.js";
import { SegmentLayoutInformation } from "./canvasConnectionLayout.js";
import { SegmentLayoutEngine } from "./segmentLayoutEngine.js";

/**
 * Segment layout engine for line segments
 */
export class LineSegmentLayoutEngine extends SegmentLayoutEngine<CanvasLineSegment> {
    override calculateMarkerRenderInformation(
        segment: CanvasLineSegment,
        marker: Marker,
        start: Point
    ): MarkerLayoutInformation {
        const end = this.engine.getPoint(segment.end);
        if (marker.pos == "start") {
            return CanvasLineSegment.calculateMarkerRenderInformation(start, end, marker);
        } else {
            return CanvasLineSegment.calculateMarkerRenderInformation(end, start, marker);
        }
    }

    override generatePathString(segment: CanvasLineSegment, layout: SegmentLayoutInformation): string {
        const end = layout.end;
        return `L ${end.x} ${end.y}`;
    }

    override generateSegments(segment: CanvasLineSegment, layout: SegmentLayoutInformation): Segment[] {
        return [
            {
                type: LineSegment.TYPE,
                end: layout.end
            }
        ];
    }
}
