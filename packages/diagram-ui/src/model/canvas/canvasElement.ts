import { Point } from "@hylimo/diagram-common";
import { Selectable, SModelElement } from "sprotty";
import { LinearAnimatable } from "../../features/animation/model";
import { isPositionProvider, PositionProvider } from "../../features/layout/positionProvider";
import { SCanvas } from "./canvas";
import { SCanvasContent } from "./canvasContent";

/**
 * Anbimated fields for SCanvasElement
 */
const canvasElementAnimatedFields = new Set(["width", "height"]);

/**
 * Model for CanvasElement
 */
export class SCanvasElement extends SCanvasContent implements PositionProvider, LinearAnimatable, Selectable {
    /**
     * The width of the element
     */
    width!: number;
    /**
     * The height of the element
     */
    height!: number;
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
        const target = this.root.index.getById(this.pos) as SModelElement;
        if (isPositionProvider(target)) {
            const targetPosition = target.position;
            return targetPosition;
        } else {
            return { x: 0, y: 0 };
        }
    }
}
