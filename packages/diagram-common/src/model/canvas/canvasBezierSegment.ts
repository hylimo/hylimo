import { Point } from "../../common/point";
import { Element } from "../base/element";
import { BaseMarker, MarkerRenderInformation } from "./marker";
import { CanvasConnectionSegment, calculateMarkerRenderInformationInternal } from "./canvasConnectionSegment";

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
     * @param value
     * @returns
     */
    export function isCanvasBezierSegment(value: Element): value is CanvasBezierSegment {
        return value.type === TYPE;
    }

    /**
     * Gets the dependencies required for layouting
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
        marker: BaseMarker
    ): MarkerRenderInformation {
        return calculateMarkerRenderInformationInternal(pos, controlPoint, marker);
    }
}
