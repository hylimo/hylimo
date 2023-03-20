import { CanvasElement, Point } from "@hylimo/diagram-common";

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
