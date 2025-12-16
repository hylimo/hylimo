import { enumType, finiteNumberType, stringType } from "@hylimo/core";
import type { FilledElement, StrokedElement } from "@hylimo/diagram-common";
import { ContainerLayout, HorizontalAlignment, VerticalAlignment, Visibility } from "../layoutElement.js";
import { LineCap, LineJoin } from "@hylimo/diagram-common";

/**
 * Visibility style attributes
 */
export const visibilityStyleAttributes = [
    {
        name: "visibility",
        description: 'optional visibility of the element, must be one of "visible", "hidden" or "collapse"',
        type: enumType(Visibility)
    }
];

/**
 * Style attributes related to size
 */
export const sizeStyleAttributes = [
    { name: "width", description: "optional width of the element, must be a number", type: finiteNumberType },
    { name: "height", description: "optional height of the element, must be a number", type: finiteNumberType },
    {
        name: "minWidth",
        description: "optional minimal width of the element, must be a number",
        type: finiteNumberType
    },
    {
        name: "minHeight",
        description: "optional minimal height of the element, must be a number",
        type: finiteNumberType
    },
    {
        name: "maxWidth",
        description: "optional maximal width of the element, must be a number",
        type: finiteNumberType
    },
    {
        name: "maxHeight",
        description: "optional maximal height of the element, must be a number",
        type: finiteNumberType
    }
];

/**
 * Horizontal and vertical alignment style attributes
 */
export const alignStyleAttributes = [
    {
        name: "hAlign",
        description: 'optional horizontal alignment, must be one of "left", "right" or "center"',
        type: enumType(HorizontalAlignment)
    },
    {
        name: "vAlign",
        description: 'optional vertical alignment, must be one of "top", "bottom" or "center"',
        type: enumType(VerticalAlignment)
    }
];

/**
 * Layout attributes for flexbox-like layout
 * These attributes define how an element behaves in a flex container
 */
export const layoutStyleAttributes = [
    {
        name: "base",
        description: "The base size for the element, for the primary axis",
        type: finiteNumberType
    },
    {
        name: "grow",
        description: "The grow factor for the element, for the primary axis",
        type: finiteNumberType
    },
    {
        name: "shrink",
        description: "The shrink factor for the element, for the primary axis",
        type: finiteNumberType
    }
];

/**
 * Default style attributes, including margin, alignment, and size attributes
 */
export const defaultStyleAttributes = [
    ...visibilityStyleAttributes,
    ...sizeStyleAttributes,
    ...alignStyleAttributes,
    ...layoutStyleAttributes,
    { name: "marginTop", description: "optional top margin of the element, must be a number", type: finiteNumberType },
    {
        name: "marginRight",
        description: "optional right margin of the element, must be a number",
        type: finiteNumberType
    },
    {
        name: "marginBottom",
        description: "optional bottom margin of the element, must be a number",
        type: finiteNumberType
    },
    {
        name: "marginLeft",
        description: "optional left margin of the element, must be a number",
        type: finiteNumberType
    },
    { name: "margin", description: "optional margin of the element, must be a number", type: finiteNumberType }
];

/**
 * Stroke-related style attributes
 */
export const strokeStyleAttributes = [
    { name: "stroke", description: "optional stroke, must be a valid color string", type: stringType },
    {
        name: "strokeOpacity",
        description: "optional stroke opacity, must be a number between 0 and 1",
        type: finiteNumberType
    },
    { name: "strokeWidth", description: "optional width of the stroke", type: finiteNumberType },
    {
        name: "strokeDash",
        description: "optional dash length. If not set, stroke is solid.",
        type: finiteNumberType
    },
    {
        name: "strokeDashSpace",
        description: "space between dashes, only used if strokeDash is set, defaults to strokeDash",
        type: finiteNumberType
    },
    {
        name: "strokeLineJoin",
        description: "the line join style",
        type: enumType(LineJoin)
    },
    {
        name: "strokeLineCap",
        description: "the line cap style",
        type: enumType(LineCap)
    },
    {
        name: "strokeMiterLimit",
        description: "the miter limit",
        type: finiteNumberType
    }
];

/**
 * Fill-related style attributes
 */
export const fillStyleAttributes = [
    {
        name: "fillOpacity",
        description: "optional fill opacity , must be a number between 0 and 1",
        type: finiteNumberType
    },
    { name: "fill", description: "optional fill of the shape, must be a valid color string", type: stringType }
];

/**
 * Shape style attributes, includes fill and stroke attributes
 */
export const shapeStyleAttributes = [...strokeStyleAttributes, ...fillStyleAttributes];

/**
 * Container style attributes, used for layout containers
 */
export const containerStyleAttributes = [
    {
        name: "layout",
        description: "the layout of the container, must be one of 'vbox', 'hbox', 'grid' or 'absolute'",
        type: enumType(ContainerLayout)
    }
];

/**
 * Extracts stroke style properties from a style record
 *
 * @param styles all styles
 * @returns the extracted and normalized style properties
 */
export function extractStrokeStyleAttributes(styles: Record<string, any>): Pick<StrokedElement, "stroke"> {
    if (styles.stroke != undefined) {
        return {
            stroke: {
                color: styles.stroke,
                opacity: styles.strokeOpacity ?? 1,
                width: styles.strokeWidth ?? 1,
                dash: styles.strokeDash,
                dashSpace: styles.strokeDashSpace ?? styles.strokeDash,
                lineCap: styles.strokeLineCap ?? LineCap.Butt,
                lineJoin: styles.strokeLineJoin ?? LineJoin.Miter,
                miterLimit: Math.max(styles.strokeMiterLimit ?? 4, 1)
            }
        };
    } else {
        return {};
    }
}

/**
 * Extracts fill style properties from a style record
 *
 * @param styles all styles
 * @returns the extracted and normalized style properties
 */
export function extractFillStyleAttributes(styles: Record<string, any>): Pick<FilledElement, "fill"> {
    if (styles.fill != undefined) {
        return {
            fill: {
                color: styles.fill,
                opacity: styles.fillOpacity ?? 1
            }
        };
    } else {
        return {};
    }
}
