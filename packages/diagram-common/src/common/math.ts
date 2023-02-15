import { Point } from "./point";

/**
 * Alias for Point with other semantic
 */
export type Vector = Point;

/**
 * A namespace containing functions for 2D vector math
 */
export namespace Math2D {
    /**
     * Adds two points together
     *
     * @param a the first vector
     * @param b the second vectory
     * @returns the sum of the two points
     */
    export function add(a: Vector, b: Vector): Point {
        return { x: a.x + b.x, y: a.y + b.y };
    }

    /**
     * Subtracts a vector from another vector
     *
     * @param a the first vector
     * @param b the second vector, subtracted from the first
     * @returns the difference of the two vectors
     */
    export function sub(a: Vector, b: Vector): Vector {
        return { x: a.x - b.x, y: a.y - b.y };
    }

    /**
     * Scales a vector by a scalar
     *
     * @param a the vector to scale
     * @param s the scalar to scale the vector by
     * @returns the scaled vector
     */
    export function scale(a: Vector, s: number): Vector {
        return { x: a.x * s, y: a.y * s };
    }

    /**
     * Creates the normal of a vector
     * @param a the vector to create the normal of
     * @returns a vector that is perpendicular to the given vector and has the same length
     */
    export function normal(a: Vector): Vector {
        return { x: a.y, y: -a.x };
    }

    /**
     * Calculates the dot product of two vectors
     *
     * @param a the first vector
     * @param b the second vector
     * @returns the dot product of the two vectors
     */
    export function dot(a: Vector, b: Vector): number {
        return a.x * b.x + a.y * b.y;
    }

    /**
     * Normalizes a vector, meaning it will have a length of 1
     *
     * @param a the vector to normalize
     * @returns the normalized vector
     */
    export function normalize(a: Vector): Vector {
        const length = Math.sqrt(a.x * a.x + a.y * a.y);
        return { x: a.x / length, y: a.y / length };
    }

    /**
     * Calculates the angle between two vectors.
     * Angles must be in radians, result will be in radians in the range of 0 to PI
     *
     * @param a the first vector
     * @param b the second vector
     * @returns the angle between the two vectors
     */
    export function angleBetween(a: Vector, b: Vector): number {
        return Math.acos(dot(a, b) / Math.sqrt(a.x * a.x + a.y * a.y * b.x * b.x + b.y * b.y));
    }

    /**
     * Calculates the length of a vector
     *
     * @param a the vector to calculate the length of
     * @returns the length of the vector
     */
    export function length(a: Vector): number {
        return Math.sqrt(a.x * a.x + a.y * a.y);
    }

    /**
     * Calculates the angle of a vector. Result will be in radians in the range of -PI to PI.
     *
     * @param a the vector to calculate the angle of
     * @returns the angle of the vector
     */
    export function angle(a: Vector): number {
        return Math.atan2(a.y, a.x);
    }

    /**
     * Calculates the distance between two points
     *
     * @param a the first point
     * @param b the second point
     * @returns the distance between the two points
     */
    export function distance(a: Point, b: Point): number {
        return length(sub(a, b));
    }

    /**
     * Interpolates between two points
     *
     * @param a the first point
     * @param b the second point
     * @param t value between 0 and 1, 0 will return a, 1 will return b
     * @returns the interpolated point
     */
    export function linearInterpolate(a: Point, b: Point, t: number): Vector {
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t
        };
    }
}
