import type { Point } from "./point.js";
import type { Size } from "./size.js";

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

export namespace Bounds {
    /**
     * Checks if the given bounds contain the given point
     *
     * @param bounds the bounds to check
     * @param point the point to check
     * @returns true if the bounds contain the point
     */
    export function contains(bounds: Bounds, point: Point): boolean {
        return (
            point.x >= bounds.position.x &&
            point.x <= bounds.position.x + bounds.size.width &&
            point.y >= bounds.position.y &&
            point.y <= bounds.position.y + bounds.size.height
        );
    }
}
