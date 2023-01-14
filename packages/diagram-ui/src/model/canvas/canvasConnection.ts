import { SChildElement } from "sprotty";
import { SCanvas } from "./canvas";

/**
 * Model for CanvasConnection
 */
export class SCanvasConnection extends SChildElement {
    override parent!: SCanvas;
}
