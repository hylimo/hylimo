import { Point } from "../common/point";
import { Segment } from "../line/model/segment";
import { CanvasConnectionSegment } from "../model/elements/canvas/canvasConnectionSegment";
import { Marker, MarkerLayoutInformation } from "../model/elements/canvas/marker";
import { SegmentLayoutInformation } from "./canvasConnectionLayout";
import { CanvasLayoutEngine } from "./canvasLayoutEngine";

/**
 * Base class for line, bezier and axisAligned canvas connection segment engines
 */
export abstract class SegmentLayoutEngine<T extends CanvasConnectionSegment> {
    /**
     * Creates a new instance of CanvasConnectionSegmentEngine.
     */
    constructor(protected readonly engine: CanvasLayoutEngine) {}

    /**
     * Calculates the MarkerRenderInformation for a marker
     *
     * @param segment the segment to use
     * @param marker the marker
     * @param start the start of this segment
     */
    abstract calculateMarkerRenderInformation(segment: T, marker: Marker, start: Point): MarkerLayoutInformation;

    /**
     * Generates an svg path string with absolute positions for this segment
     *
     * @param segment the segment to use
     * @param layout defines the segment start and end points
     * @return the generated path string
     */
    abstract generatePathString(segment: T, layout: SegmentLayoutInformation): string;

    /**
     * Generates the line segments for path points
     *
     * @param segment the segment to use
     * @param layout defines the segment start and end points
     * @return the generated line segments
     */
    abstract generateSegments(segment: T, layout: SegmentLayoutInformation): Segment[];
}
