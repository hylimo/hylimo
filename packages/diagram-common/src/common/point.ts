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
}
