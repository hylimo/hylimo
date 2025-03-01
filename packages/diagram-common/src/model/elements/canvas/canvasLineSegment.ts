import type { Point } from "../../../common/point.js";
import type { Element } from "../base/element.js";
import type { Marker, MarkerLayoutInformation } from "./marker.js";
import type { CanvasConnectionSegment } from "./canvasConnectionSegment.js";
import { calculateMarkerRenderInformationInternal } from "./canvasConnectionSegment.js";

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
     *
     * @param value the element to check
     * @returns true if the element is a CanvasLineSegment
     */
    export function isCanvasLineSegment(value: Element): value is CanvasLineSegment {
        return value.type === TYPE;
    }

    /**
     * Gets the dependencies required for layouting
     *
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
        marker: Marker
    ): MarkerLayoutInformation {
        return calculateMarkerRenderInformationInternal(pos, otherEnd, marker);
    }
}
