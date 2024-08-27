import { Point } from "../common/point.js";
import { BezierSegment } from "../line/model/bezierSegment.js";
import { CanvasBezierSegment } from "../model/elements/canvas/canvasBezierSegment.js";
import { Marker, MarkerLayoutInformation } from "../model/elements/canvas/marker.js";
import { SegmentLayoutInformation } from "./canvasConnectionLayout.js";
import { SegmentLayoutEngine } from "./segmentLayoutEngine.js";

/**
 * Segment layout engine for bezier segments
 */
export class BezierSegmentLayoutEngine extends SegmentLayoutEngine<CanvasBezierSegment> {
    override calculateMarkerRenderInformation(
        segment: CanvasBezierSegment,
        marker: Marker,
        start: Point
    ): MarkerLayoutInformation {
        if (marker.pos == "start") {
            return CanvasBezierSegment.calculateMarkerRenderInformation(
                start,
                this.engine.getPoint(segment.startControlPoint),
                marker
            );
        } else {
            return CanvasBezierSegment.calculateMarkerRenderInformation(
                this.engine.getPoint(segment.end),
                this.engine.getPoint(segment.endControlPoint),
                marker
            );
        }
    }

    override generatePathString(segment: CanvasBezierSegment, layout: SegmentLayoutInformation): string {
        const c1 = this.engine.getPoint(segment.startControlPoint);
        const c2 = this.engine.getPoint(segment.endControlPoint);
        const end = layout.end;
        return `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
    }

    override generateSegments(segment: CanvasBezierSegment, layout: SegmentLayoutInformation): BezierSegment[] {
        return [
            {
                type: BezierSegment.TYPE,
                end: layout.end,
                startControlPoint: this.engine.getPoint(segment.startControlPoint),
                endControlPoint: this.engine.getPoint(segment.endControlPoint),
                origin: segment.id
            }
        ];
    }
}
