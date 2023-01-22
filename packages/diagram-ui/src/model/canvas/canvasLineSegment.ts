import { CanvasLineSegment, MarkerRenderInformation, Point } from "@hylimo/diagram-common";
import { SCanvasConnectionSegment } from "./canvasConnectionSegment";
import { SMarker } from "./marker";

/**
 * Model for CanvasLineSegment
 */
export class SCanvasLineSegment extends SCanvasConnectionSegment {
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
}
