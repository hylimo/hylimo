import type { Point, RelativePoint } from "@hylimo/diagram-common";
import type { LinearAnimatable } from "../../features/animation/model.js";
import { SCanvasPoint } from "./sCanvasPoint.js";

/**
 * Animated fields for SRelativePoint
 */
const relativePointAnimatedFields = new Set(["offsetX", "offsetY"]);

/**
 * Model for RelativePoint
 */
export class SRelativePoint extends SCanvasPoint implements RelativePoint, LinearAnimatable {
    override type!: typeof RelativePoint.TYPE;
    readonly animatedFields = relativePointAnimatedFields;
    /**
     * The relative x coordinate of the element
     */
    offsetX!: number;
    /**
     * The relative y coordinate of the element
     */
    offsetY!: number;
    /**
     * The id of the target point
     */
    target!: string;
    /**
     * Position of the target
     */
    targetPosition!: Point;

    constructor() {
        super();
        this.cachedProperty<Point>("targetPosition", () => {
            return this.root.layoutEngine.getPoint(this.target, this.parent.id);
        });
    }

    override get dependencies(): string[] {
        return [this.target];
    }
}

/**
 * Position with an origin
 * Useful for rendering the
 */
export interface PointWithTarget extends Point {
    /**
     * The target point
     */
    target: Point;
}
