import {
    CanvasAxisAlignedSegment,
    LineSegment,
    MarkerRenderInformation,
    ModificationSpecification,
    Point
} from "@hylimo/diagram-common";
import { VNode } from "snabbdom";
import { SCanvasConnectionSegment } from "./sCanvasConnectionSegment";
import { SMarker } from "./sMarker";

export class SCanvasAxisAlignedSegment extends SCanvasConnectionSegment implements CanvasAxisAlignedSegment {
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

    override generatePathString(start: Point, end: Point): string {
        const verticalX = start.x + (end.x - start.x) * this.verticalPos;
        return `H ${verticalX} V ${end.y} H ${end.x}`;
    }

    override generateControlViewElements(_start: Point): VNode[] {
        return [];
    }

    override generateSegments(start: Point, end: Point): LineSegment[] {
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
