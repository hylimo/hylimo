import { SChildElement } from "sprotty";
import { SCanvasConnection } from "./canvasConnection";

/**
 * Base model for all CanvasConnectionSegments
 */
export abstract class SCanvasConnectionSegment extends SChildElement {
    override parent!: SCanvasConnection;
}
