import { Point } from "@hylimo/diagram-common";
import { SModelElement } from "sprotty";
import { LinearAnimatable } from "../../features/animation/model";
import { PositionProvider } from "../../features/layout/positionProvider";
import { SCanvasContent } from "./canvasContent";
import { SCanvasPoint } from "./canvasPoint";

/**
 * Anbimated fields for SCanvasElement
 */
const canvasElementAnimatedFields = new Set(["width", "height"]);

/**
 * Model for CanvasElement
 */
export class SCanvasElement extends SCanvasContent implements PositionProvider, LinearAnimatable {
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
        const target = this.root.index.getById(this.pos) as SCanvasPoint;
        return target.position;
    }

    override get dependencies(): string[] {
        return [this.pos];
    }
}
