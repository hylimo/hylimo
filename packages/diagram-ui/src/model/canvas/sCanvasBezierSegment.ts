import { CanvasBezierSegment, MarkerRenderInformation, Point } from "@hylimo/diagram-common";
import { VNode } from "snabbdom";
import { svg } from "sprotty";
import { SCanvasConnectionSegment } from "./sCanvasConnectionSegment";
import { SCanvasPoint } from "./sCanvasPoint";
import { SMarker } from "./sMarker";

/**
 * Model for CanvasBezierSegment
 */
export class SCanvasBezierSegment extends SCanvasConnectionSegment implements CanvasBezierSegment {
    override type!: typeof CanvasBezierSegment.TYPE;
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

    override generateControlViewElements(start: Point, end: Point): VNode[] {
        const c1 = this.startControlPointPosition;
        const c2 = this.endControlPointPosition;
        const className = "bezier-handle-line";
        return [
            svg("line", {
                attrs: {
                    x1: start.x,
                    x2: c1.x,
                    y1: start.y,
                    y2: c1.y
                },
                class: {
                    [className]: true
                }
            }),
            svg("line", {
                attrs: {
                    x1: end.x,
                    x2: c2.x,
                    y1: end.y,
                    y2: c2.y
                },
                class: {
                    [className]: true
                }
            })
        ];
    }
}
