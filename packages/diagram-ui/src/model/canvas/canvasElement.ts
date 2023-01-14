import { Point } from "@hylimo/diagram-common";
import { LinearAnimatable } from "../../features/animation/model";
import { isPositionProvider, PositionProvider } from "../../features/layout/positionProvider";
import { SSizedElement } from "../sizedElement";
import { SCanvas } from "./canvas";

/**
 * Anbimated fields for SCanvasElement
 */
const canvasElementAnimatedFields = new Set(SSizedElement.defaultAnimatedFields);

/**
 * Model for CanvasElement
 */
export class SCanvasElement extends SSizedElement implements PositionProvider, LinearAnimatable {
    override parent!: SCanvas;
    readonly animatedFields = canvasElementAnimatedFields;
    /**
     * The id of the CanvasPoint which is used as start
     */
    pos!: string;
    /**
     * If true, this is resizable
     */
    resizable!: boolean;

    get position(): Point {
        const target = this.parent.getChildById(this.pos);
        if (isPositionProvider(target)) {
            const targetPosition = target.position;
            return targetPosition;
        } else {
            return { x: 0, y: 0 };
        }
    }
}
