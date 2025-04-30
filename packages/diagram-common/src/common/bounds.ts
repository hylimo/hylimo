import { Point } from "./point.js";
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

    /**
     * Generates a new bounds object from the given points
     *
     * @param points the points to generate the bounds from
     * @returns the smallest bounds that contains all points
     */
    export function ofPoints(points: Point[]): Bounds {
        if (points.length === 0) {
            return { position: { x: 0, y: 0 }, size: { width: 0, height: 0 } };
        }
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        for (const point of points) {
            if (point.x < minX) {
                minX = point.x;
            }
            if (point.y < minY) {
                minY = point.y;
            }
            if (point.x > maxX) {
                maxX = point.x;
            }
            if (point.y > maxY) {
                maxY = point.y;
            }
        }
        return {
            position: { x: minX, y: minY },
            size: { width: maxX - minX, height: maxY - minY }
        };
    }

    /**
     * Compares two bounds based on their positions.
     *
     * @param a The first bounds to compare.
     * @param b The second bounds to compare.
     * @returns A negative number if `a` is less than `b`, zero if they are equal,
     *          or a positive number if `a` is greater than `b`.
     */
    export function compare(a: Bounds, b: Bounds): number {
        return Point.compare(a.position, b.position);
    }

    /**
     * Checks if two bounds are equal.
     *
     * @param a The first bounds to compare.
     * @param b The second bounds to compare.
     * @returns True if both bounds have the same position and size, false otherwise.
     */
    export function equals(a: Bounds, b: Bounds): boolean {
        return Point.equals(a.position, b.position) && a.size.width === b.size.width && a.size.height === b.size.height;
    }
}
