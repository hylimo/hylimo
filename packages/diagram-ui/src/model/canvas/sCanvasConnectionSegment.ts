import { MarkerRenderInformation, Point, Segment } from "@hylimo/diagram-common";
import { SCanvasConnection } from "./sCanvasConnection";
import { SCanvasPoint } from "./sCanvasPoint";
import { SMarker } from "./sMarker";
import { VNode } from "snabbdom";
import { SElement } from "../sElement";

/**
 * Base model for all CanvasConnectionSegments
 */
export abstract class SCanvasConnectionSegment extends SElement {
    override parent!: SCanvasConnection;
    /**
     * The id of the end point
     */
    end!: string;

    /**
     * Getter for the position associated with end
     */
    readonly endPosition!: Point;

    constructor() {
        super();
        this.cachedProperty<Point>("endPosition", () => {
            const target = this.root.index.getById(this.end) as SCanvasPoint;
            return target.position;
        });
    }

    /**
     * List of dependencies of this CanvasContent
     */
    abstract get dependencies(): string[];

    /**
     * Calculates the MarkerRenderInformation for a marker
     *
     * @param marker the marker
     * @param start the start of this segment
     */
    abstract calculateMarkerRenderInformation(marker: SMarker, start: Point): MarkerRenderInformation;

    /**
     * Generates an svg path string with absolute positions for this segment
     *
     * @param layout defines the segment start and end points
     * @return the generated path string
     */
    abstract generatePathString(layout: SegmentLayoutInformation): string;

    /**
     * Generates the control elements rendered when the connection is selected
     *
     * @param layout defines the segment start and end points
     * @returns the generated nodes
     */
    abstract generateControlViewElements(layout: SegmentLayoutInformation): VNode[];

    /**
     * Generates the line segments for path points
     *
     * @param layout defines the segment start and end points
     * @return the generated line segments
     */
    abstract generateSegments(layout: SegmentLayoutInformation): Segment[];
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
