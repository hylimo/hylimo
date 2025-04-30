/**
 * Point consisting of a x and y coordinate
 */
export interface Point {
    x: number;
    y: number;
}

export namespace Point {
    /**
     * Constant origin at (0,0)
     */
    export const ORIGIN = Object.freeze({ x: 0, y: 0 });

    /**
     * Checks if two points are equal
     *
     * @param a the first point
     * @param b the second point
     * @returns true if the points are equal
     */
    export function equals(a: Point, b: Point): boolean {
        return a.x === b.x && a.y === b.y;
    }

    /**
     * Compares two points lexicographically.
     *
     * @param a The first point to compare.
     * @param b The second point to compare.
     * @returns A negative number if `a` is less than `b`, zero if they are equal,
     *          or a positive number if `a` is greater than `b`.
     */
    export function compare(a: Point, b: Point): number {
        if (a.x === b.x) {
            return a.y - b.y;
        }
        return a.x - b.x;
    }
}
