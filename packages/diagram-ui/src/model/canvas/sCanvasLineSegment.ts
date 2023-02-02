import { CanvasLineSegment, MarkerRenderInformation, Point } from "@hylimo/diagram-common";
import { SCanvasConnectionSegment } from "./sCanvasConnectionSegment";
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

    override calculateMarkerRenderInformation(marker: SMarker, start: Point, end: Point): MarkerRenderInformation {
        if (marker.pos == "start") {
            return CanvasLineSegment.calculateMarkerRenderInformation(start, end, marker);
        } else {
            return CanvasLineSegment.calculateMarkerRenderInformation(end, start, marker);
        }
    }

    override generatePathString(end: Point): string {
        return `L ${end.x} ${end.y}`;
    }

    override generateControlViewElements(start: Point, end: Point): VNode[] {
        return [];
    }
}
