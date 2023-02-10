import { enumType, numberType, stringType } from "@hylimo/core";
import { HorizontalAlignment, VerticalAlignment } from "../layoutElement";

/**
 * Style attributes related to size
 */
export const sizeStyleAttributes = [
    { name: "width", description: "optional width of the element, must be a number", type: numberType },
    { name: "height", description: "optional height of the element, must be a number", type: numberType },
    { name: "minWidth", description: "optional minimal width of the element, must be a number", type: numberType },
    {
        name: "minHeight",
        description: "optional minimal height of the element, must be a number",
        type: numberType
    },
    { name: "maxWidth", description: "optional maximal width of the element, must be a number", type: numberType },
    {
        name: "maxHeight",
        description: "optional maximal height of the element, must be a number",
        type: numberType
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
 * Default style attributes, including margin, alignment, and size attributes
 */
export const defaultStyleAttributes = [
    ...sizeStyleAttributes,
    ...alignStyleAttributes,
    { name: "marginTop", description: "optional top margin of the element, must be a number", type: numberType },
    {
        name: "marginRight",
        description: "optional right margin of the element, must be a number",
        type: numberType
    },
    {
        name: "marginBottom",
        description: "optional bottom margin of the element, must be a number",
        type: numberType
    },
    { name: "marginLeft", description: "optional left margin of the element, must be a number", type: numberType },
    { name: "margin", description: "optional margin of the element, must be a number", type: numberType }
];

/**
 * Stroke-related style attributes
 */
export const strokeStyleAttributes = [
    { name: "stroke", description: "optional stroke, must be a valid color string", type: stringType },
    {
        name: "stokeOpacity",
        description: "optional stroke opacity, must be a number between 0 and 1",
        type: numberType
    },
    { name: "strokeWidth", description: "optional width of the stroke", type: numberType }
];

/**
 * Fill-related style attributes
 */
export const fillStyleAtrributes = [
    {
        name: "fillOpacity",
        description: "optional fill opacity , must be a number between 0 and 1",
        type: numberType
    },
    { name: "fill", description: "optional fill of the shape, must be a valid color string", type: stringType }
];

/**
 * Shape style attributes, includes fill and stroke attributes
 */
export const shapeStyleAttributes = [...strokeStyleAttributes, ...fillStyleAtrributes];
