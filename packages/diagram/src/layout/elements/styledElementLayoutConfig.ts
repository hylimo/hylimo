import { enumType, numberType } from "@hylimo/core";
import { HorizontalAlignment, AttributeConfig, VerticalAlignment } from "../layoutElement";
import { ElementLayoutConfig } from "./elementLayoutConfig";

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
 * Default style attributes
 */
const defaultStyleAttributes = [
    ...sizeStyleAttributes,
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
    { name: "margin", description: "optional margin of the element, must be a number", type: numberType },
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
 * Layout config for elements with default styles (width, height, ...)
 */
export abstract class StyledElementLayoutConfig extends ElementLayoutConfig {
    /**
     * Creates a new StyledElementLayoutConfig
     *
     * @param type the supported type
     * @param additionalAttributes additional non-style attributes
     * @param styleAttributes the supported style attributes
     */
    constructor(type: string, additionalAttributes: AttributeConfig[], additionalStyleAttributes: AttributeConfig[]) {
        super(type, additionalAttributes, [...defaultStyleAttributes, ...additionalStyleAttributes]);
    }
}
