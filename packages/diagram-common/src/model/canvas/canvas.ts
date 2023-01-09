import { Element } from "../element";
import { CanvasPoint } from "./canvasPoint";

/**
 * Canvas consisting of points, elements and connections.
 * Must have only CanvasElement and CanvasConnection as children
 */
export interface Canvas extends Element {
    /**
     * Named points used by its children
     */
    points: CanvasPoint[];
}
