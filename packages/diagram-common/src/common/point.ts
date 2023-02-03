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
}
