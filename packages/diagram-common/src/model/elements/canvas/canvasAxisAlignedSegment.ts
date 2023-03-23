import { calculateMarkerRenderInformationInternal, CanvasConnectionSegment } from "./canvasConnectionSegment";
import { Element } from "../base/element";
import { Point } from "bezier-js";
import { Marker, MarkerLayoutInformation } from "./marker";
import { ModificationSpecification } from "../modificationSpecification";

/**
 * Axis aligned connection segment, consiting of a vertical and one or two horizontal segments.
 */
export interface CanvasAxisAlignedSegment extends CanvasConnectionSegment {
    type: typeof CanvasAxisAlignedSegment.TYPE;
    /**
     * The position on the x-axis where the vertical segment starts
     * Between 0 and 1, 0 being the start of the horizontal segment and 1 being the end
     */
    verticalPos: number;
    /**
     * Defines if verticalPos is editable
     */
    editable: ModificationSpecification;
}

export namespace CanvasAxisAlignedSegment {
    /**
     * Type associated with CanvasAxisAlignedSegment
     */
    export const TYPE = "canvasAxisAlignedSegment";

    /**
     * Checks if an element is a CanvasAxisAlignedSegment
     *
     * @param value the element to check
     * @returns true if the element is a CanvasAxisAlignedSegment
     */
    export function isCanvasAxisAlignedSegment(value: Element): value is CanvasAxisAlignedSegment {
        return value.type === TYPE;
    }

    /**
     * Gets the dependencies required for layouting
     *
     * @param element the element to get the dependencies of
     * @returns the list of dependencies, may contain duplicates
     */
    export function getDependencies(element: CanvasAxisAlignedSegment): string[] {
        return [element.end];
    }

    /**
     * Calculates the MarkerRenderInformation based on the two points of the line and the size of the marker
     *
     * @param pos the position of the end with the marker
     * @param endPoint the end point of the axis aligned segment
     * @param verticalPos the position on the x-axis where the vertical segment starts
     * @param marker the marker to render
     */
    export function calculateMarkerRenderInformation(
        pos: Point,
        endPoint: Point,
        verticalPos: number,
        marker: Marker
    ): MarkerLayoutInformation {
        if (verticalPos === 0) {
            return calculateMarkerRenderInformationInternal(pos, { x: pos.x, y: endPoint.y }, marker);
        } else {
            return calculateMarkerRenderInformationInternal(pos, { x: endPoint.x, y: pos.y }, marker);
        }
    }
}
