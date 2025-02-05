import { Bounds } from "./bounds.js";
import { Point } from "./point.js";

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
     * Scale a vector to a given length
     *
     * @param a the vector to scale
     * @param length the length to scale the vector to
     * @returns the scaled vector
     */
    export function scaleTo(a: Vector, length: number): Vector {
        return scale(normalize(a), length);
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
     * Except for the zero vector, which will stay the zero vector
     *
     * @param a the vector to normalize
     * @returns the normalized vector
     */
    export function normalize(a: Vector): Vector {
        const length = Math.sqrt(a.x * a.x + a.y * a.y);
        if (length === 0) {
            return { x: 0, y: 0 };
        }
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
        const denominator = Math.sqrt((a.x * a.x + a.y * a.y) * (b.x * b.x + b.y * b.y));
        if (denominator === 0) {
            return 0;
        }
        return Math.acos(dot(a, b) / denominator);
    }

    /**
     * Calculates the length of a vector
     *
     * @param a the vector to calculate the length of
     * @returns the length of the vector
     */
    export function length(a: Vector): number {
        return Math.hypot(a.x, a.y);
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

    /**
     * Rotates a vector by a given angle (in radians)
     *
     * @param vector the vector to rotate
     * @param angle the angle to rotate the vector by
     * @returns the rotated vector
     */
    export function rotate(vector: Vector, angle: number): Vector {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: vector.x * cos - vector.y * sin,
            y: vector.x * sin + vector.y * cos
        };
    }

    /**
     * Merges a list of bounds into a single bounds
     *
     * @param bounds the bounds to merge
     * @returns the merged bounds
     */
    export function mergeBounds(...bounds: Bounds[]): Bounds {
        if (bounds.length === 0) {
            return {
                position: {
                    x: 0,
                    y: 0
                },
                size: {
                    width: 0,
                    height: 0
                }
            };
        }
        const minX = Math.min(...bounds.map((b) => b.position.x));
        const minY = Math.min(...bounds.map((b) => b.position.y));
        const maxX = Math.max(...bounds.map((b) => b.position.x + b.size.width));
        const maxY = Math.max(...bounds.map((b) => b.position.y + b.size.height));
        return {
            position: {
                x: minX,
                y: minY
            },
            size: {
                width: maxX - minX,
                height: maxY - minY
            }
        };
    }

    /**
     * Rotates the given bounds by the given angle (in radians)
     *
     * @param bounds the bounds to rotate
     * @param rotation the rotation to apply to the bounds
     * @returns the rotated bounds
     */
    export function rotateBounds(bounds: Bounds, rotation: number): Bounds {
        const topLeft = rotate(bounds.position, rotation);
        const topRight = rotate(add({ x: bounds.size.width, y: 0 }, bounds.position), rotation);
        const bottomLeft = rotate(add({ x: 0, y: bounds.size.height }, bounds.position), rotation);
        const bottomRight = rotate(add({ x: bounds.size.width, y: bounds.size.height }, bounds.position), rotation);
        const minX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
        const minY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
        const maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
        const maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
        return {
            position: {
                x: minX,
                y: minY
            },
            size: {
                width: maxX - minX,
                height: maxY - minY
            }
        };
    }
}
