import { Point } from "@hylimo/diagram-common";
import { LinearAnimatable } from "../../features/animation/model";
import { SCanvasPoint } from "./sCanvasPoint";

const linePointAnimatedFields = new Set(["pos"]);

/**
 * Model for LinePoint
 */
export class SLinePoint extends SCanvasPoint implements LinearAnimatable {
    readonly animatedFields = linePointAnimatedFields;
    /**
     * The id of the CanvasElement or CanvasConnection which provides the line
     */
    lineProvider!: string;
    /**
     * The position where on the line the point is located, between 0 and 1
     */
    pos!: number;

    override get position(): Point {
        throw new Error("TODO");
    }

    override get dependencies(): string[] {
        // maybe TODO
        return [];
    }
}
