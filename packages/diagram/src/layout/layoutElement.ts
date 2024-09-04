import { ExecutableAbstractFunctionExpression, FullObject, Type } from "@hylimo/core";
import { EditSpecification, Element, Line, Point, Size } from "@hylimo/diagram-common";
import { Layout } from "./engine/layout.js";
import { Bounds } from "@hylimo/diagram-common";

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
     * The id of the element
     */
    id: string;
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
    styles: Record<string, any>;
    /**
     * Edit specifications for the element
     */
    edits: EditSpecification;
    /**
     * After measure the computed size
     */
    measuredSize?: Size;
    /**
     * The size the element requested
     */
    requestedSize?: Size;
    /**
     * Bounds provided at layout
     */
    layoutBounds?: Bounds;
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
    layoutConfig: LayoutConfig;
    /**
     * Set of classes
     */
    class: Set<string>;
}

/**
 * Defines a style attribute
 */
export interface AttributeConfig {
    /**
     * The name of the attribute
     */
    name: string;
    /**
     * The type the attribute must have (unset is always allowed)
     */
    type: Type;
    /**
     * Documentation of the attribute
     */
    description: string;
}

/**
 * Defines the cardinality of the contents attribute
 */
export enum ContentCardinality {
    /**
     * 0
     */
    None,
    /**
     * 0..1
     */
    Optional,
    /**
     * 1
     */
    ExactlyOne,
    /**
     * 0..*
     */
    Many,
    /**
     * 1..*
     */
    AtLeastOne
}

/**
 * Interface defining how to layout a UI element
 */
export interface LayoutConfig {
    /**
     * What type of element is supported
     */
    type: string;
    /**
     * List of style attributes it supports
     */
    styleAttributes: AttributeConfig[];
    /**
     * Non-style attributes it supports
     */
    attributes: AttributeConfig[];
    /**
     * The type of the contents attribute
     */
    contentType: Type;
    /**
     * The cardinality of the contents attribute
     */
    contentCardinality: ContentCardinality;
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
    layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[];
    /**
     * Called to create the outline of an element
     *
     * @param layout performs the layout
     * @param element the element to get the outline of
     * @param position offset in current context
     * @param size the size of the element
     * @param id the id of the element
     * @returns the outline of the element
     */
    outline(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Line;
    /**
     * Called to provide a function which evaluates to the prototype of the element.
     * The function will be called with the general element prototype as first argument.
     *
     * @returns the prototype generation function
     */
    createPrototype(): ExecutableAbstractFunctionExpression;
    /**
     * Called to postprocess the extracted styles
     *
     * @param element the element to postprocess
     * @param styles the extracted styles
     * @returns the postprocessed styles
     */
    postprocessStyles(element: LayoutElement, styles: Record<string, any>): Record<string, any>;
}
