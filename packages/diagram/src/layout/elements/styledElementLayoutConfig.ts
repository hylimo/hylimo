import { AttributeConfig } from "../layoutElement.js";
import { defaultStyleAttributes } from "./attributes.js";
import { ElementLayoutConfig } from "./elementLayoutConfig.js";

/**
 * Layout config for elements with default styles (width, height, ...)
 */
export abstract class StyledElementLayoutConfig extends ElementLayoutConfig {
    /**
     * Creates a new StyledElementLayoutConfig
     *
     * @param additionalAttributes additional non-style attributes
     * @param styleAttributes the supported style attributes
     */
    constructor(additionalAttributes: AttributeConfig[], additionalStyleAttributes: AttributeConfig[]) {
        super(additionalAttributes, [...defaultStyleAttributes, ...additionalStyleAttributes]);
    }
}
