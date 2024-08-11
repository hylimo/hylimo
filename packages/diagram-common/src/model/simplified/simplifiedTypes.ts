import { Bounds } from "../../common/bounds.js";
import { Point } from "../../common/point.js";
import { Element } from "../elements/base/element.js";
import { CanvasElement } from "../elements/canvas/canvasElement.js";

/**
 * Simplified version of CanvasElement where pos is replaced with the actual point
 */
export interface SimplifiedCanvasElement
    extends Omit<CanvasElement, "pos" | "rotateable" | "xResizable" | "yResizable" | "moveable" | "outline"> {
    /**
     * The position of the element
     */
    pos: Point;
}

/**
 * Type for an element with bounds
 */
export type WithBounds<T extends Element> = T & { bounds: Bounds; children: WithBounds<Element>[] };
