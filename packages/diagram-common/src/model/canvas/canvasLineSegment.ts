import { Point } from "../../common/point";
import { Element } from "../base/element";
import { BaseMarker, MarkerRenderInformation } from "./marker";
import { CanvasConnectionSegment, calculateMarkerRenderInformationInternal } from "./canvasConnectionSegment";

/**
 * Direct line connection segment
 */

export interface CanvasLineSegment extends CanvasConnectionSegment {
    type: typeof CanvasLineSegment.TYPE;
}

export namespace CanvasLineSegment {
    /**
     * Type associated with CanvasLineSegment
     */
    export const TYPE = "canvasLineSegment";

    /**
     * Checks if an element is a CanvasLineSegment
     * @param value
     * @returns
     */
    export function isCanvasLineSegment(value: Element): value is CanvasLineSegment {
        return value.type === TYPE;
    }

    /**
     * Gets the dependencies required for layouting
     * @param element the element to get the dependencies of
     * @returns the list of dependencies, may contain duplicates
     */
    export function getDependencies(element: CanvasLineSegment): string[] {
        return [element.end];
    }

    /**
     * Calculates the MarkerRenderInformation based on the two points of the line and the size of the marker
     *
     * @param pos the position of the end with the marker
     * @param otherEnd the position of the other end
     * @param marker the marker to render
     */
    export function calculateMarkerRenderInformation(
        pos: Point,
        otherEnd: Point,
        marker: BaseMarker
    ): MarkerRenderInformation {
        return calculateMarkerRenderInformationInternal(pos, otherEnd, marker);
    }
}
