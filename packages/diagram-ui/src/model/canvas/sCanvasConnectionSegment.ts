import type { Point, SegmentLayoutInformation } from "@hylimo/diagram-common";
import type { SCanvasConnection } from "./sCanvasConnection.js";
import type { SCanvasPoint } from "./sCanvasPoint.js";
import type { VNode } from "snabbdom";
import { SElement } from "../sElement.js";

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
            const target = this.index.getById(this.end) as SCanvasPoint;
            return target.position;
        });
    }

    /**
     * List of dependencies of this CanvasContent
     */
    abstract get dependencies(): string[];

    /**
     * Generates the control elements rendered when the connection is selected
     *
     * @param model the parent connection
     * @param layout defines the segment start and end points
     * @param index the index of the segment
     * @returns the generated nodes
     */
    abstract generateControlViewElements(
        model: Readonly<SCanvasConnection>,
        layout: SegmentLayoutInformation,
        index: number
    ): VNode[];

    /**
     * Checks if this segment can be split using an edit
     *
     * @returns true if the segment can be split
     */
    abstract canSplitSegment(): boolean;
}
