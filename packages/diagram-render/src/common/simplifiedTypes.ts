import { CanvasConnection, CanvasElement, Point } from "@hylimo/diagram-common";

/**
 * Simplified version of CanvasElement where pos is replaced with the actual point
 */
export interface SimplifiedCanvasElement extends Omit<CanvasElement, "pos"> {
    /**
     * The position of the element
     */
    pos: Point;
}

export interface SimplifiedCanvasConnection extends Omit<CanvasConnection, "start"> {
    /**
     * The svg path string of the path the connnection represents
     */
    path: string;
}
