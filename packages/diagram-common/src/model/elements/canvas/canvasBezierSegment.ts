import { Point } from "../../../common/point.js";
import { Element } from "../base/element.js";
import { Marker, MarkerLayoutInformation } from "./marker.js";
import { CanvasConnectionSegment, calculateMarkerRenderInformationInternal } from "./canvasConnectionSegment.js";

/**
 * Cubic bezier connection segment
 */
export interface CanvasBezierSegment extends CanvasConnectionSegment {
    type: typeof CanvasBezierSegment.TYPE;
    /**
     * The id of the start control point
     */
    startControlPoint: string;
    /**
     * The id of the end control point
     */
    endControlPoint: string;
}

export namespace CanvasBezierSegment {
    /**
     * Type associated with CanvasBezierSegment
     */
    export const TYPE = "canvasBezierSegment";

    /**
     * Checks if an element is a CanvasBezierSegment
     *
     * @param value the element to check
     * @returns true if the element is a CanvasBezierSegment
     */
    export function isCanvasBezierSegment(value: Element): value is CanvasBezierSegment {
        return value.type === TYPE;
    }

    /**
     * Gets the dependencies required for layouting
     *
     * @param element the element to get the dependencies of
     * @returns the list of dependencies, may contain duplicates
     */
    export function getDependencies(element: CanvasBezierSegment): string[] {
        return [element.end, element.startControlPoint, element.endControlPoint];
    }

    /**
     * Calculates the MarkerRenderInformation based on the two points of the line and the size of the marker
     *
     * @param pos the position of the end with the marker
     * @param controlPoint the control point of the end
     * @param marker the marker to render
     */
    export function calculateMarkerRenderInformation(
        pos: Point,
        controlPoint: Point,
        marker: Marker
    ): MarkerLayoutInformation {
        return calculateMarkerRenderInformationInternal(pos, controlPoint, marker);
    }
}
