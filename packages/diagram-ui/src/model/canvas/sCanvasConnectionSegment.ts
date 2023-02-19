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
     * @param end the end point
     * @return the generated path string
     */
    abstract generatePathString(end: Point): string;

    /**
     * Generates the control elements rendered when the connection is selected
     *
     * @param start the original start point (independent of marker)
     * @returns the generated nodes
     */
    abstract generateControlViewElements(start: Point): VNode[];

    /**
     * Generates the line segments for path points
     * @param start the start point
     * @return the generated line segments
     */
    abstract generateSegments(start: Point): Segment[];
}
