import { Point } from "../common/point";
import { Line } from "../line/model/line";
import { MarkerLayoutInformation } from "../model/elements/canvas/marker";

/**
 * The layout of a CanvasConnection
 */
export interface CanvasConnectionLayout {
    /**
     * The line which represents the connection
     */
    line: Line;
    /**
     * The svg path string of the connection
     */
    path: string;
    /**
     * If a start marker exisists, the information required to render it
     */
    startMarker?: MarkerLayoutInformation;
    /**
     * If an end marker exisists, the information required to render it
     */
    endMarker?: MarkerLayoutInformation;
    /**
     * Layout information for each segment
     */
    segments: SegmentLayoutInformation[];
}

/**
 * Information required to render a segment
 */
export interface SegmentLayoutInformation {
    /**
     * The start of the segment with respect to a potential marker
     */
    start: Point;
    /**
     * The end of the segment with respect to a potential marker
     */
    end: Point;
    /**
     * The original start of the segment
     */
    originalStart: Point;
    /**
     * The original end of the segment
     */
    originalEnd: Point;
}
