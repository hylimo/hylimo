import { Point } from "@hylimo/diagram-common";
import { LinearAnimatable } from "../../features/animation/model";
import { isPositionProvider } from "../../features/layout/positionProvider";
import { SCanvasPoint } from "./canvasPoint";

/**
 * Animated fields for SRelativePoint
 */
const relativePointAnimatedFields = new Set(["offsetX", "offsetY"]);

/**
 * Model for RelativePoint
 */
export class SRelativePoint extends SCanvasPoint implements LinearAnimatable {
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

    override get position(): PointWithTarget {
        const target = this.parent.getChildById(this.target);
        if (isPositionProvider(target)) {
            const targetPosition = target.position;
            return {
                x: targetPosition.x + this.offsetX,
                y: targetPosition.y + this.offsetY,
                target: targetPosition
            };
        } else {
            return { x: this.offsetX, y: this.offsetY, target: { x: 0, y: 0 } };
        }
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
