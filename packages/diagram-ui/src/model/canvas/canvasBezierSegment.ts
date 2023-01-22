import { CanvasBezierSegment, MarkerRenderInformation, Point } from "@hylimo/diagram-common";
import { SCanvasConnectionSegment } from "./canvasConnectionSegment";
import { SCanvasPoint } from "./canvasPoint";
import { SMarker } from "./marker";

/**
 * Model for CanvasBezierSegment
 */
export class SCanvasBezierSegment extends SCanvasConnectionSegment {
    /**
     * The id of the start control point
     */
    startControlPoint!: string;
    /**
     * The id of the end control point
     */
    endControlPoint!: string;

    /**
     * Getter for the position associated with startControlPoint
     */
    get startControlPointPosition(): Point {
        const target = this.root.index.getById(this.startControlPoint) as SCanvasPoint;
        return target.position;
    }

    /**
     * Getter for the position associated with endControlPoint
     */
    get endControlPointPosition(): Point {
        const target = this.root.index.getById(this.endControlPoint) as SCanvasPoint;
        return target.position;
    }

    override get dependencies(): string[] {
        return [this.end, this.startControlPoint, this.endControlPoint];
    }

    override calculateMarkerRenderInformation(marker: SMarker, start: Point, end: Point): MarkerRenderInformation {
        if (marker.pos == "start") {
            return CanvasBezierSegment.calculateMarkerRenderInformation(start, this.startControlPointPosition, marker);
        } else {
            return CanvasBezierSegment.calculateMarkerRenderInformation(end, this.endControlPointPosition, marker);
        }
    }

    override generatePathString(end: Point): string {
        const c1 = this.startControlPointPosition;
        const c2 = this.endControlPointPosition;
        return `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
    }
}
