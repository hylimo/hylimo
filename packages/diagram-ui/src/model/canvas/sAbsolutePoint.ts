import { Point } from "@hylimo/diagram-common";
import { LinearAnimatable } from "../../features/animation/model";
import { SCanvasPoint } from "./sCanvasPoint";

/**
 * Animated fields for SAbsolutePoint
 */
const absolutePointAnimatedFields = new Set(["x", "y"]);

/**
 * Model for AbsolutePoint
 */
export class SAbsolutePoint extends SCanvasPoint implements Point, LinearAnimatable {
    readonly animatedFields = absolutePointAnimatedFields;
    /**
     * The absolute x coordinate of the element
     */
    x!: number;
    /**
     * The absolute y coordinate of the element
     */
    y!: number;

    override get position(): Point {
        return { x: this.x, y: this.y };
    }

    override get dependencies(): string[] {
        return [];
    }
}
