import { LineJoin, LineCap } from "@hylimo/diagram-common";
import type { Stroke } from "@hylimo/diagram-common";

export { LineJoin, LineCap };

/**
 * The stroke properties the shape engine needs, always resolved to concrete values (a shape with
 * no stroke uses width 0). This is the subset {@link svgPathBbox} consumes plus the join/limit the
 * content-box analysis needs for the inward miter spike.
 */
export interface ShapeStroke {
    /**
     * The stroke width, 0 if the shape has no stroke
     */
    width: number;
    /**
     * How the stroke is painted where two segments meet
     */
    lineJoin: LineJoin;
    /**
     * How the stroke is painted at the ends of an open sub-path
     */
    lineCap: LineCap;
    /**
     * How far a miter join may extend past the corner before it is beveled
     */
    miterLimit: number;
}

/**
 * Resolves a (possibly undefined) model stroke into the concrete stroke the engine needs
 *
 * @param stroke the model stroke, or undefined if the shape has no stroke
 * @returns the resolved stroke, with defaults filled in
 */
export function resolveStroke(stroke: Stroke | undefined): ShapeStroke {
    return {
        width: stroke?.width ?? 0,
        lineJoin: stroke?.lineJoin ?? LineJoin.Miter,
        lineCap: stroke?.lineCap ?? LineCap.Butt,
        miterLimit: stroke?.miterLimit ?? 4
    };
}

/**
 * Which size the caller supplies:
 * - `outer`: the target is the *rendered* bounding box (stroke included); the geometry is
 *   shrunk so the stroke — including miter spill at sharp corners — fits inside.
 * - `inner`: the target is the *content* box; the geometry grows so the content region
 *   (clear of the stroke and the authored insets) matches.
 */
export type SizingMode = "outer" | "inner";

/**
 * A width/height pair
 */
export interface Size {
    /**
     * The width
     */
    width: number;
    /**
     * The height
     */
    height: number;
}

/**
 * An axis-aligned rectangle
 */
export interface Box {
    /**
     * The x coordinate of the left edge
     */
    x: number;
    /**
     * The y coordinate of the top edge
     */
    y: number;
    /**
     * The width
     */
    width: number;
    /**
     * The height
     */
    height: number;
}
