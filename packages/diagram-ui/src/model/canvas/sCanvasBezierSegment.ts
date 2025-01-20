import {
    CanvasBezierSegment,
    DefaultEditTypes,
    EditSpecification,
    Point,
    SegmentLayoutInformation
} from "@hylimo/diagram-common";
import { VNode } from "snabbdom";
import { svg } from "sprotty";
import { SCanvasConnectionSegment } from "./sCanvasConnectionSegment.js";
import { SCanvasPoint } from "./sCanvasPoint.js";

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
            const target = this.index.getById(this.startControlPoint) as SCanvasPoint;
            return target.position;
        });
        this.cachedProperty<Point>("endControlPointPosition", () => {
            const target = this.index.getById(this.endControlPoint) as SCanvasPoint;
            return target.position;
        });
    }

    override get dependencies(): string[] {
        return [this.end, this.startControlPoint, this.endControlPoint];
    }

    override generateControlViewElements(layout: SegmentLayoutInformation): VNode[] {
        const c1 = this.startControlPointPosition;
        const c2 = this.endControlPointPosition;
        const className = "bezier-handle-line";
        const start = layout.originalStart;
        const end = layout.originalEnd;
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

    override canSplitSegment(): boolean {
        return EditSpecification.isConsistent([[this.edits[DefaultEditTypes.SPLIT_CANVAS_BEZIER_SEGMENT]]]);
    }
}
