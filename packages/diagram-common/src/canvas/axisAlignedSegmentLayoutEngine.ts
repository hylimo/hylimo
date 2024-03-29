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
            return CanvasAxisAlignedSegment.calculateMarkerRenderInformation(start, end, segment.pos, marker);
        } else {
            return CanvasAxisAlignedSegment.calculateMarkerRenderInformation(
                end,
                start,
                segment.pos < 0 ? -1 - segment.pos : 1 - segment.pos,
                marker
            );
        }
    }

    override generatePathString(segment: CanvasAxisAlignedSegment, layout: SegmentLayoutInformation): string {
        const { start, end } = layout;
        if (segment.pos >= 0) {
            const verticalX = start.x + (end.x - start.x) * segment.pos;
            return `H ${verticalX} V ${end.y} H ${end.x}`;
        } else {
            const horizontalY = end.y + (end.y - start.y) * segment.pos;
            return `V ${horizontalY} H ${end.x} V ${end.y}`;
        }
    }

    override generateSegments(segment: CanvasAxisAlignedSegment, layout: SegmentLayoutInformation): Segment[] {
        const { start, end } = layout;
        if (segment.pos >= 0) {
            const verticalX = start.x + (end.x - start.x) * segment.pos;
            return [
                this.createLineSegment(verticalX, start.y),
                this.createLineSegment(verticalX, end.y),
                this.createLineSegment(end.x, end.y)
            ];
        } else {
            const horizontalY = end.y + (end.y - start.y) * segment.pos;
            return [
                this.createLineSegment(start.x, horizontalY),
                this.createLineSegment(end.x, horizontalY),
                this.createLineSegment(end.x, end.y)
            ];
        }
    }

    /**
     * Creates a line segment with the given end point
     *
     * @param endX the x coordinate of the end point
     * @param endY the y coordinate of the end point
     * @returns the created line segment
     */
    private createLineSegment(endX: number, endY: number): LineSegment {
        return {
            type: LineSegment.TYPE,
            end: {
                x: endX,
                y: endY
            }
        };
    }
}
