import type { Path, Point, Size } from "@hylimo/diagram-common";
import type { LinearAnimatable, PathAnimatable } from "../features/animation/model.js";
import { SShape } from "./sShape.js";

/**
 * Animated fields for SPath
 */
const pathAnimatedFields = new Set(SShape.defaultAnimatedFields);

/**
 * Path fields animated by morphing (the outline, its decoration and its clip region). Interpolating
 * these keeps the geometry resizing smoothly instead of snapping to its final size and only
 * translating into place — and keeps a clip in step with the path it clips while both resize.
 */
const pathMorphedFields = new Set(["path", "decoration", "clip"]);

/**
 * Path model element
 */
export class SPath extends SShape implements Path, LinearAnimatable, PathAnimatable {
    override type!: typeof Path.TYPE;
    readonly animatedFields = pathAnimatedFields;
    readonly pathAnimatedFields = pathMorphedFields;

    /**
     * Defines the path
     */
    path!: string;
    /**
     * Optional stroke-only decoration sub-path drawn on top of the outline (never filled).
     */
    decoration?: string;
    /**
     * Optional clip region the path is painted through, local to the element's `x`/`y`.
     */
    clip?: string;
    /**
     * The area the clipped stroke covers, for renderers without clipping support. Unused here, as
     * the browser clips, and never morphed: it is a region whose vertex count follows the geometry.
     */
    clipFill?: string;
    /**
     * Defines the view box of the path
     * Usually, a transformation is computed to fit the viewbox to the element's bounds
     */
    viewBox!: Point & Size;
}
