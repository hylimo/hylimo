import type { Point } from "../common/point.js";
import type { Segment } from "../line/model/segment.js";
import type { CanvasConnectionSegment } from "../model/elements/canvas/canvasConnectionSegment.js";
import type { Marker, MarkerLayoutInformation } from "../model/elements/canvas/marker.js";
import type { SegmentLayoutInformation } from "./canvasConnectionLayout.js";
import type { CanvasLayoutEngine } from "./canvasLayoutEngine.js";

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
     * @param context the id of the canvas containing the canvas connection
     * @return the calculated MarkerRenderInformation
     */
    abstract calculateMarkerRenderInformation(
        segment: T,
        marker: Marker,
        start: Point,
        context: string
    ): MarkerLayoutInformation;

    /**
     * Generates an svg path string with absolute positions for this segment
     *
     * @param segment the segment to use
     * @param layout defines the segment start and end points
     * @param context the id of the canvas containing the canvas connection
     * @return the generated path string
     */
    abstract generatePathString(segment: T, layout: SegmentLayoutInformation, context: string): string;

    /**
     * Generates the line segments for path points
     *
     * @param segment the segment to use
     * @param layout defines the segment start and end points
     * @param context the id of the canvas containing the canvas connection
     * @return the generated line segments
     */
    abstract generateSegments(segment: T, layout: SegmentLayoutInformation, context: string): Segment[];
}
