import { AttributeConfig } from "../layoutElement";
import { defaultStyleAttributes } from "./attributes";
import { ElementLayoutConfig } from "./elementLayoutConfig";

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
