import type { Element } from "./base/element.js";
import type { Shape } from "./shape.js";

/**
 * An SVG path shape
 * Note: while x and y have to be respected, width and height should be ignored
 */
export interface Path extends Shape {
    type: typeof Path.TYPE;
    /**
     * Defines the path (the filled + stroked outline)
     */
    path: string;
    /**
     * Optional additional stroke-only sub-path(s) drawn on top of the outline but never filled —
     * the internal decoration of a compound shape (a database rim, a note crease, component ports).
     * Painted with the same stroke as the outline; absent for a plain path.
     */
    decoration?: string;
    /**
     * Optional clip region the path is painted through, as a closed SVG path. In the same coordinate
     * space as {@link path}, meaning local to the element's `x`/`y`. Everything outside it is not
     * drawn, which is how a divider terminates exactly at the outline of the shape it belongs to
     * even where its own geometry deliberately overshoots.
     */
    clip?: string;
    /**
     * The area the stroke of {@link path} covers once {@link clip} has been applied, as a closed
     * path to be filled with the stroke's own paint and not stroked itself. Always accompanies
     * {@link clip}, and is what a renderer whose output has to survive without clipping support
     * paints instead of the clipped stroke.
     */
    clipFill?: string;
}

export namespace Path {
    /**
     * Type associated with Path
     */
    export const TYPE = "path";

    /**
     * Checks if an element is a Path
     *
     * @param value the element to check
     * @returns true if the element is a Path
     */
    export function isPath(value: Element): value is Path {
        return value.type === TYPE;
    }
}
