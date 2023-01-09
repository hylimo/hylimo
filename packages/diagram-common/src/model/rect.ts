import { Shape } from "./shape";

/**
 * A rectangle with content
 */
export interface Rect extends Shape {
    type: "rect";
    /**
     * The radius of the corners
     */
    cornerRadius?: number;
}