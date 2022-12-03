import { FieldEntry, FullObject } from "@hylimo/core";
import { Dimension, Point } from "sprotty-protocol";
import { Element } from "../model/base";
import { Layout } from "./layoutEngine";

/**
 * Simple size interface with a width and a height
 */
export type Size = Dimension;

/**
 * Size constraints from min to max size
 */
export interface SizeConstraints {
    min: Size;
    max: Size;
}

/**
 * Adds an additive value to height and width of both max and min of a SizeConstraints
 *
 * @param constraints the basis for the new computed constraints
 * @param additiveWidth the value to add to width
 * @param additiveHeight the value to add to height
 * @returns the new computed size constraints
 */
export function addToConstraints(
    constraints: SizeConstraints,
    additiveWidth: number,
    additiveHeight: number
): SizeConstraints {
    return {
        min: addToSize(constraints.min, additiveWidth, additiveHeight),
        max: addToSize(constraints.max, additiveWidth, additiveHeight)
    };
}

/**
 * Adds an additive value to height and width of the size
 *
 * @param size the base size
 * @param additiveWidth the value to add to width
 * @param additiveHeight the value to add to height
 * @returns the new computed size constraints
 */
export function addToSize(size: Size, additiveWidth: number, additiveHeight: number): Size {
    return {
        width: size.width + additiveWidth,
        height: size.height + additiveHeight
    };
}

/**
 * Creats a size that fits the constraints, assuming the constraints are well-defined
 *
 * @param size the size to fit
 * @param constraints the constraints for the size
 */
export function matchToConstraints(size: Size, constraints: SizeConstraints): Size {
    return {
        width: Math.min(Math.max(constraints.min.width, size.width), constraints.max.width),
        height: Math.min(Math.max(constraints.min.height, size.height), constraints.max.height)
    };
}

/**
 * Simple position interface consisting of an x and y coordinate
 */
export type Position = Point;

/**
 * Controls the horizontal alignment of an element
 */
export enum HorizontalAlignment {
    LEFT = "left",
    CENTER = "center",
    RIGHT = "right"
}

/**
 * Controls the vertical alignment of an element
 */
export enum VerticalAlignment {
    TOP = "top",
    CENTER = "center",
    BOTTOM = "bottom"
}

/**
 * Style based information required for the layout
 */
export interface LayoutInformation {
    /**
     * Top margin
     */
    marginTop: number;
    /**
     * Bottom margin
     */
    marginBottom: number;
    /**
     * Left margin
     */
    marginLeft: number;
    /**
     * Right margin
     */
    marginRight: number;
}

/**
 * The element to layout
 */
export interface LayoutElement {
    /**
     * The element to layout
     */
    element: FullObject;
    /**
     * The parent element, required for style matching
     */
    parent?: LayoutElement;
    /**
     * Computed styles
     */
    styles: { [key: string]: any };
    /**
     * Sources of the styles
     */
    styleSources: Map<string, FieldEntry>;
    /**
     * After measure the computed size
     */
    measuredSize?: Size;
    /**
     * Other required layout data
     */
    [key: string]: any;
    /**
     * Layout information required to be present after style computation
     */
    layoutInformation?: LayoutInformation;
    /**
     * Helper for layouting
     */
    layoutConfig: LayoutElementConfig;
    /**
     * Set of classes
     */
    class: Set<string>;
}

/**
 * Interface defining how to layout a UI element
 */
export interface LayoutElementConfig {
    /**
     * What type of element is supported
     */
    type: string;
    /**
     * List of style attributes it supports
     */
    styleAttributes: string[];
    /**
     * Called to determine the size the element requires
     *
     * @param layout performs the layout
     * @param element the element to measure
     * @param constraints defines min and max size
     * @returns the calculated size
     */
    measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size;
    /**
     * Called to render the element
     *
     * @param layout performs the layout
     * @param element the element to render
     * @param position offset in current context
     * @param size the size of the element
     * @param id the id of the element
     * @returns the rendered element
     */
    layout(layout: Layout, element: LayoutElement, position: Position, size: Size, id: string): Element[];
}
