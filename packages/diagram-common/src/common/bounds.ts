import { Point } from "./point.js";
import { Size } from "./size.js";

/**
 * Bounds, defined by a point and a size
 */
export interface Bounds {
    /**
     * The size of the bounds
     */
    size: Size;
    /**
     * The position of the bounds
     */
    position: Point;
}
