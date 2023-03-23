import { Point } from "../common/point";
import { LineSegment } from "../line/model/lineSegment";
import { Segment } from "../line/model/segment";
import { CanvasAxisAlignedSegment } from "../model/elements/canvas/canvasAxisAlignedSegment";
import { Marker, MarkerLayoutInformation } from "../model/elements/canvas/marker";
import { SegmentLayoutInformation } from "./canvasConnectionLayout";
import { SegmentLayoutEngine } from "./segmentLayoutEngine";

/**
 * Segment layout engine for line segments
 */
export class AxisAlignedSegmentLayoutEngine extends SegmentLayoutEngine<CanvasAxisAlignedSegment> {
    override calculateMarkerRenderInformation(
        segment: CanvasAxisAlignedSegment,
        marker: Marker,
        start: Point
    ): MarkerLayoutInformation {
        const end = this.engine.getPoint(segment.end);
        if (marker.pos == "start") {
            return CanvasAxisAlignedSegment.calculateMarkerRenderInformation(start, end, segment.verticalPos, marker);
        } else {
            return CanvasAxisAlignedSegment.calculateMarkerRenderInformation(
                end,
                start,
                1 - segment.verticalPos,
                marker
            );
        }
    }

    override generatePathString(segment: CanvasAxisAlignedSegment, layout: SegmentLayoutInformation): string {
        const { start, end } = layout;
        const verticalX = start.x + (end.x - start.x) * segment.verticalPos;
        return `H ${verticalX} V ${end.y} H ${end.x}`;
    }

    override generateSegments(segment: CanvasAxisAlignedSegment, layout: SegmentLayoutInformation): Segment[] {
        const { start, end } = layout;
        const verticalX = start.x + (end.x - start.x) * segment.verticalPos;
        return [
            {
                type: LineSegment.TYPE,
                end: {
                    x: verticalX,
                    y: start.y
                }
            },
            {
                type: LineSegment.TYPE,
                end: {
                    x: verticalX,
                    y: end.y
                }
            },
            {
                type: LineSegment.TYPE,
                end
            }
        ];
    }
}
