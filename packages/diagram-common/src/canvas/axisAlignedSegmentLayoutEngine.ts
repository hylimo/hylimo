import { Point } from "../common/point.js";
import { LineSegment } from "../line/model/lineSegment.js";
import { Segment } from "../line/model/segment.js";
import { CanvasAxisAlignedSegment } from "../model/elements/canvas/canvasAxisAlignedSegment.js";
import { Marker, MarkerLayoutInformation } from "../model/elements/canvas/marker.js";
import { SegmentLayoutInformation } from "./canvasConnectionLayout.js";
import { SegmentLayoutEngine } from "./segmentLayoutEngine.js";

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
                this.createLineSegment(verticalX, start.y, segment.id, 0),
                this.createLineSegment(verticalX, end.y, segment.id, 1),
                this.createLineSegment(end.x, end.y, segment.id, 2)
            ];
        } else {
            const horizontalY = end.y + (end.y - start.y) * segment.pos;
            return [
                this.createLineSegment(start.x, horizontalY, segment.id, 0),
                this.createLineSegment(end.x, horizontalY, segment.id, 1),
                this.createLineSegment(end.x, end.y, segment.id, 2)
            ];
        }
    }

    /**
     * Creates a line segment with the given end point
     *
     * @param endX the x coordinate of the end point
     * @param endY the y coordinate of the end point
     * @param origin the id of the element this segment originates from
     * @param originSegment the index of the segment of {@link origin} this segment originates from
     * @returns the created line segment
     */
    private createLineSegment(endX: number, endY: number, origin: string, originSegment: number): LineSegment {
        return {
            type: LineSegment.TYPE,
            end: {
                x: endX,
                y: endY
            },
            origin,
            originSegment
        };
    }
}
