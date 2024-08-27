import { Point } from "../../common/point.js";

/**
 * Segment of a Line
 */
export interface Segment {
    /**
     * The type of line segment
     */
    type: string;
    /**
     * End position
     */
    end: Point;
    /**
     * The id of the element this segment originates from
     */
    origin: string;
}
