import { Line } from "../../../line/model/line";
import { Element } from "../base/element";
import { LayoutedElement } from "../base/layoutedElement";
import { ModificationSpecification } from "../modificationSpecification";

/**
 * Moveable and resizeable element in a canvas
 */
export interface CanvasElement extends LayoutedElement {
    type: typeof CanvasElement.TYPE;
    /**
     * The id of the CanvasPoint which is used as start
     */
    pos?: string;
    /**
     * The rotation in degrees
     */
    rotation: number;
    /**
     * Resizable in x-direction if present
     */
    xResizable: ModificationSpecification;
    /**
     * Resizable in y-direction if present
     */
    yResizable: ModificationSpecification;
    /**
     * Rotateable if present
     */
    rotateable: ModificationSpecification;
    /**
     * Moveable if present
     */
    moveable: ModificationSpecification;
    /**
     * The outline of the CanvasElement
     */
    outline: Line;
}

export namespace CanvasElement {
    /**
     * Type associated with CanvasElement
     */
    export const TYPE = "canvasElement";

    /**
     * Checks if an element is a CanvasElement
     * @param value
     * @returns
     */
    export function isCanvasElement(value: Element): value is CanvasElement {
        return value.type === TYPE;
    }

    /**
     * Gets the dependencies required for layouting
     * @param element the element to get the dependencies of
     * @returns the list of dependencies, may contain duplicates
     */
    export function getDependencies(element: CanvasElement): string[] {
        if (element.pos != undefined) {
            return [element.pos];
        } else {
            return [];
        }
    }
}
