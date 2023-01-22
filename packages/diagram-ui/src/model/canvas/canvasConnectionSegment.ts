import { MarkerRenderInformation, Point } from "@hylimo/diagram-common";
import { SChildElement } from "sprotty";
import { SCanvasConnection } from "./canvasConnection";
import { SCanvasPoint } from "./canvasPoint";
import { SMarker } from "./marker";

/**
 * Base model for all CanvasConnectionSegments
 */
export abstract class SCanvasConnectionSegment extends SChildElement {
    override parent!: SCanvasConnection;
    /**
     * The id of the end point
     */
    end!: string;

    /**
     * Getter for the position associated with end
     */
    get endPosition(): Point {
        const target = this.root.index.getById(this.end) as SCanvasPoint;
        return target.position;
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
     * @param end the end of this segment
     */
    abstract calculateMarkerRenderInformation(marker: SMarker, start: Point, end: Point): MarkerRenderInformation;

    /**
     * Generates an svg path string with absolute positions for this segment
     *
     * @param end the end point
     */
    abstract generatePathString(end: Point): string;
}
