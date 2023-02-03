import { Point, RelativePoint } from "@hylimo/diagram-common";
import { SModelElement } from "sprotty";
import { LinearAnimatable } from "../../features/animation/model";
import { isPositionProvider } from "../../features/layout/positionProvider";
import { SCanvasPoint } from "./sCanvasPoint";

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
    override position!: PointWithTarget;

    constructor() {
        super();

        this.cachedProperty("position", () => {
            const target = this.root.index.getById(this.target) as SModelElement;
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
