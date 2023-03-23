import { Element } from "../base/element";
import { PositionedElement } from "../base/positionedElement";
import { ModificationSpecification } from "../modificationSpecification";

/**
 * Named point on a canvas
 */
export interface CanvasPoint extends Element {
    /**
     * If present, this point is manipulatable
     */
    editable: ModificationSpecification;
}

/**
 * Absolute point on a canvas consisting of an x and y coordinate
 */
export interface AbsolutePoint extends PositionedElement, CanvasPoint {
    type: typeof AbsolutePoint.TYPE;
}

export namespace AbsolutePoint {
    /**
     * Type associated with AbsolutePoint
     */
    export const TYPE = "absolutePoint";

    /**
     * Checks if an element is a AbsolutePoint
     * @param value
     * @returns
     */
    export function isAbsolutePoint(value: Element): value is AbsolutePoint {
        return value.type === TYPE;
    }

    /**
     * Gets the dependencies required for layouting
     * @param element the element to get the dependencies of
     * @returns the list of dependencies, may contain duplicates
     */
    export function getDependencies(_element: AbsolutePoint): string[] {
        return [];
    }
}

/**
 * Relative point, dependent on a point and offset in both x and y direction
 */
export interface RelativePoint extends CanvasPoint {
    type: typeof RelativePoint.TYPE;
    /**
     * The id of the point this is relative of
     */
    target: string;
    /**
     * The offset in x direction
     */
    offsetX: number;
    /**
     * The offset in y direction
     */
    offsetY: number;
}

export namespace RelativePoint {
    /**
     * Type associated with RelativePoint
     */
    export const TYPE = "relativePoint";

    /**
     * Checks if an element is a RelativePoint
     * @param value
     * @returns
     */
    export function isRelativePoint(value: Element): value is RelativePoint {
        return value.type === TYPE;
    }

    /**
     * Gets the dependencies required for layouting
     * @param element the element to get the dependencies of
     * @returns the list of dependencies, may contain duplicates
     */
    export function getDependencies(element: RelativePoint): string[] {
        return [element.target];
    }
}

/**
 * Point on a line, consisting of the id of a line provider and the position on the line
 */
export interface LinePoint extends CanvasPoint {
    type: typeof LinePoint.TYPE;
    /**
     * The id of the CanvasElement or CanvasConnection which provides the line
     */
    lineProvider: string;
    /**
     * The position where on the line the point is located, between 0 and 1
     */
    pos: number;
    /**
     * The distance of the point to the line
     */
    distance?: number;
}

export namespace LinePoint {
    /**
     * Type associated with LinePoint
     */
    export const TYPE = "linePoint";

    /**
     * Checks if an element is a LinePoint
     * @param value
     * @returns
     */
    export function isLinePoint(value: Element): value is LinePoint {
        return value.type === TYPE;
    }

    /**
     * Calculates the segment index for a given position
     *
     * @param position the position on the line, between 0 and 1
     * @param segmentCount the number of segments the line has
     * @returns the index of the segment position is located on
     */
    export function calcSegmentIndex(position: number, segmentCount: number): number {
        return Math.min(Math.max(Math.floor(position * segmentCount), 0), segmentCount - 1);
    }

    /**
     * Gets the dependencies required for layouting
     * @param element the element to get the dependencies of
     * @returns the list of dependencies, may contain duplicates
     */
    export function getDependencies(element: LinePoint): string[] {
        return [element.lineProvider];
    }
}
