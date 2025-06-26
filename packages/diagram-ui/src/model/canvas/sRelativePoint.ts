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
     * The id of the point/element the x-coordinate is relative to
     */
    targetX!: string;
    /**
     * The id of the point the y-coordinate is relative to
     */
    targetY!: string;
    /**
     * Position of the x-target
     */
    targetXPosition!: Point;
    /**
     * Position of the y-target
     */
    targetYPosition!: Point;

    constructor() {
        super();
        this.cachedProperty<Point>("targetXPosition", () => {
            return this.root.layoutEngine.getPoint(this.targetX, this.parent.id);
        });
        this.cachedProperty<Point>("targetYPosition", () => {
            return this.root.layoutEngine.getPoint(this.targetY, this.parent.id);
        });
    }

    override get dependencies(): string[] {
        return [this.targetX, this.targetY];
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
