import { LineCap, LineJoin, Path, Point, Size } from "@hylimo/diagram-common";
import { LinearAnimatable } from "../features/animation/model";
import { SShape } from "./sShape";

/**
 * Animated fields for SPath
 */
const pathAnimatedFields = new Set(SShape.defaultAnimatedFields);

/**
 * Path model element
 */
export class SPath extends SShape implements Path, LinearAnimatable {
    override type!: typeof Path.TYPE;
    readonly animatedFields = pathAnimatedFields;

    /**
     * Defines the path
     */
    path!: string;
    /**
     * Defines how segments are joined together
     */
    lineJoin!: LineJoin;
    /**
     * Defines how the end of a line is drawn
     */
    lineCap!: LineCap;
    /**
     * Defines the max miter length relative to the line width
     */
    miterLimit!: number;
    /**
     * Defines the view box of the path
     * Usually, a transformation is computed to fit the viewbox to the element's bounds
     */
    viewBox!: Point & Size;
}
