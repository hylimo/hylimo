import { CanvasLineSegment, LineSegment, MarkerRenderInformation, Point } from "@hylimo/diagram-common";
import { SCanvasConnectionSegment, SegmentLayoutInformation } from "./sCanvasConnectionSegment";
import { SMarker } from "./sMarker";
import { VNode } from "snabbdom";

/**
 * Model for CanvasLineSegment
 */
export class SCanvasLineSegment extends SCanvasConnectionSegment implements CanvasLineSegment {
    override type!: typeof CanvasLineSegment.TYPE;
    override get dependencies(): string[] {
        return [this.end];
    }

    override calculateMarkerRenderInformation(marker: SMarker, start: Point): MarkerRenderInformation {
        const end = this.endPosition;
        if (marker.pos == "start") {
            return CanvasLineSegment.calculateMarkerRenderInformation(start, end, marker);
        } else {
            return CanvasLineSegment.calculateMarkerRenderInformation(end, start, marker);
        }
    }

    override generatePathString(layout: SegmentLayoutInformation): string {
        const end = layout.end;
        return `L ${end.x} ${end.y}`;
    }

    override generateControlViewElements(_layout: SegmentLayoutInformation): VNode[] {
        return [];
    }

    override generateSegments(layout: SegmentLayoutInformation): LineSegment[] {
        return [
            {
                type: LineSegment.TYPE,
                end: layout.end
            }
        ];
    }
}
