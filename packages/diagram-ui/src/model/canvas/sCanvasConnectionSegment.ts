import { Point, SegmentLayoutInformation } from "@hylimo/diagram-common";
import { SCanvasConnection } from "./sCanvasConnection.js";
import { SCanvasPoint } from "./sCanvasPoint.js";
import { VNode } from "snabbdom";
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
            const target = this.root.index.getById(this.end) as SCanvasPoint;
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
     * @param layout defines the segment start and end points
     * @returns the generated nodes
     */
    abstract generateControlViewElements(layout: SegmentLayoutInformation): VNode[];
}
