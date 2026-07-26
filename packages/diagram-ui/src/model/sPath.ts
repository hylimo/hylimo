import type { Path, Point, Size } from "@hylimo/diagram-common";
import type { LinearAnimatable, PathAnimatable } from "../features/animation/model.js";
import { SShape } from "./sShape.js";

/**
 * Animated fields for SPath
 */
const pathAnimatedFields = new Set(SShape.defaultAnimatedFields);

/**
 * Path fields animated by morphing (the outline and its decoration). Interpolating these keeps the
 * geometry resizing smoothly instead of snapping to its final size and only translating into place.
 */
const pathMorphedFields = new Set(["path", "decoration"]);

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
     * Defines the view box of the path
     * Usually, a transformation is computed to fit the viewbox to the element's bounds
     */
    viewBox!: Point & Size;
}
