import { Point, RelativePoint } from "@hylimo/diagram-common";
import { SModelElement } from "sprotty";
import { LinearAnimatable } from "../../features/animation/model.js";
import { isPositionProvider } from "../../features/layout/positionProvider.js";
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
            const target = this.root.index.getById(this.target) as SModelElement;
            if (isPositionProvider(target)) {
                return target.position;
            } else {
                return Point.ORIGIN;
            }
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
