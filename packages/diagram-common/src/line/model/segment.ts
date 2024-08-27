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
     * The id of the element this segment originates from and which segment of the original element it is
     * (e.g. an axis-aligned segment of a canvas line consists of 3 segments)
     */
    origin: [string, number];
}
