import {
    CanvasAxisAlignedSegment,
    LineSegment,
    MarkerRenderInformation,
    ModificationSpecification,
    Point
} from "@hylimo/diagram-common";
import { VNode } from "snabbdom";
import { svg } from "sprotty";
import { SCanvasConnectionSegment, SegmentLayoutInformation } from "./sCanvasConnectionSegment";
import { SMarker } from "./sMarker";

export class SCanvasAxisAlignedSegment extends SCanvasConnectionSegment implements CanvasAxisAlignedSegment {
    /**
     * Class applied to the vertical edit helper line
     */
    static readonly SEGMENT_EDIT_CLASS = "axis-aligned-segment-edit";
    override type!: typeof CanvasAxisAlignedSegment.TYPE;
    /**
     * The position on the x-axis where the vertical segment starts
     * Between 0 and 1, 0 being the start of the horizontal segment and 1 being the end
     */
    verticalPos!: number;
    /**
     * Defines if verticalPos is editable
     */
    editable!: ModificationSpecification;

    override get dependencies(): string[] {
        return [this.end];
    }

    override calculateMarkerRenderInformation(marker: SMarker, start: Point): MarkerRenderInformation {
        if (marker.pos == "start") {
            return CanvasAxisAlignedSegment.calculateMarkerRenderInformation(
                start,
                this.endPosition,
                this.verticalPos,
                marker
            );
        } else {
            return CanvasAxisAlignedSegment.calculateMarkerRenderInformation(
                this.endPosition,
                start,
                1 - this.verticalPos,
                marker
            );
        }
    }

    override generatePathString(layout: SegmentLayoutInformation): string {
        const { start, end } = layout;
        const verticalX = start.x + (end.x - start.x) * this.verticalPos;
        return `H ${verticalX} V ${end.y} H ${end.x}`;
    }

    override generateControlViewElements(layout: SegmentLayoutInformation): VNode[] {
        if (this.editable != undefined) {
            const { start, end } = layout;
            const verticalX = start.x + (end.x - start.x) * this.verticalPos;
            return [
                svg("line", {
                    attrs: {
                        x1: verticalX,
                        y1: start.y,
                        x2: verticalX,
                        y2: end.y,
                        "data-start-x": start.x,
                        "data-end-x": end.x,
                        "data-id": this.id
                    },
                    class: {
                        resize: true,
                        [SCanvasAxisAlignedSegment.SEGMENT_EDIT_CLASS]: true
                    }
                })
            ];
        } else {
            return [];
        }
    }

    override generateSegments(layout: SegmentLayoutInformation): LineSegment[] {
        const { start, end } = layout;
        const verticalX = start.x + (end.x - start.x) * this.verticalPos;
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
