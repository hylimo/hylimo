import type { Point } from "../common/point.js";
import { BezierSegment } from "../line/model/bezierSegment.js";
import { CanvasBezierSegment } from "../model/elements/canvas/canvasBezierSegment.js";
import type { Marker, MarkerLayoutInformation } from "../model/elements/canvas/marker.js";
import type { SegmentLayoutInformation } from "./canvasConnectionLayout.js";
import { SegmentLayoutEngine } from "./segmentLayoutEngine.js";

/**
 * Segment layout engine for bezier segments
 */
export class BezierSegmentLayoutEngine extends SegmentLayoutEngine<CanvasBezierSegment> {
    override calculateMarkerRenderInformation(
        segment: CanvasBezierSegment,
        marker: Marker,
        start: Point,
        context: string
    ): MarkerLayoutInformation {
        if (marker.pos == "start") {
            return CanvasBezierSegment.calculateMarkerRenderInformation(
                start,
                this.engine.getPoint(segment.startControlPoint, context),
                marker
            );
        } else {
            return CanvasBezierSegment.calculateMarkerRenderInformation(
                this.engine.getPoint(segment.end, context),
                this.engine.getPoint(segment.endControlPoint, context),
                marker
            );
        }
    }

    override generatePathString(
        segment: CanvasBezierSegment,
        layout: SegmentLayoutInformation,
        context: string
    ): string {
        const c1 = this.engine.getPoint(segment.startControlPoint, context);
        const c2 = this.engine.getPoint(segment.endControlPoint, context);
        const end = layout.end;
        return `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
    }

    override generateSegments(
        segment: CanvasBezierSegment,
        layout: SegmentLayoutInformation,
        context: string
    ): BezierSegment[] {
        return [
            {
                type: BezierSegment.TYPE,
                end: layout.end,
                startControlPoint: this.engine.getPoint(segment.startControlPoint, context),
                endControlPoint: this.engine.getPoint(segment.endControlPoint, context),
                origin: segment.id,
                originSegment: 0
            }
        ];
    }
}
