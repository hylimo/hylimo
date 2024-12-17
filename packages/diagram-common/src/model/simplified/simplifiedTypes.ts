import { Point } from "../../common/point.js";
import { CanvasElement } from "../elements/canvas/canvasElement.js";
import { Text } from "../elements/text.js";

/**
 * Simplified version of CanvasElement where pos is replaced with the actual point
 */
export interface SimplifiedCanvasElement
    extends Omit<
        CanvasElement,
        "pos" | "rotateable" | "xResizable" | "yResizable" | "moveable" | "outline" | "dx" | "dy"
    > {
    /**
     * The position of the element
     */
    pos: Point;
}

/**
 * Simplified version of Text where underline and strikethrough are removed
 */
export type SimplifiedText = Omit<Text, "underline" | "strikethrough">;
