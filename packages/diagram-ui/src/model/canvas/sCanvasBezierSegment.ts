import { BezierSegment, CanvasBezierSegment, MarkerRenderInformation, Point } from "@hylimo/diagram-common";
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
    readonly startControlPointPosition!: Point;

    /**
     * Getter for the position associated with endControlPoint
     */
    readonly endControlPointPosition!: Point;

    constructor() {
        super();

        this.cachedProperty<Point>("startControlPointPosition", () => {
            const target = this.root.index.getById(this.startControlPoint) as SCanvasPoint;
            return target.position;
        });
        this.cachedProperty<Point>("endControlPointPosition", () => {
            const target = this.root.index.getById(this.endControlPoint) as SCanvasPoint;
            return target.position;
        });
    }

    override get dependencies(): string[] {
        return [this.end, this.startControlPoint, this.endControlPoint];
    }

    override calculateMarkerRenderInformation(marker: SMarker, start: Point): MarkerRenderInformation {
        if (marker.pos == "start") {
            return CanvasBezierSegment.calculateMarkerRenderInformation(start, this.startControlPointPosition, marker);
        } else {
            return CanvasBezierSegment.calculateMarkerRenderInformation(
                this.endPosition,
                this.endControlPointPosition,
                marker
            );
        }
    }

    override generatePathString(): string {
        const c1 = this.startControlPointPosition;
        const c2 = this.endControlPointPosition;
        const end = this.endPosition;
        return `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
    }

    override generateControlViewElements(start: Point): VNode[] {
        const c1 = this.startControlPointPosition;
        const c2 = this.endControlPointPosition;
        const end = this.endPosition;
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

    override generateSegments(_start: Point): BezierSegment[] {
        return [
            {
                type: BezierSegment.TYPE,
                end: this.endPosition,
                startControlPoint: this.startControlPointPosition,
                endControlPoint: this.endControlPointPosition
            }
        ];
    }
}