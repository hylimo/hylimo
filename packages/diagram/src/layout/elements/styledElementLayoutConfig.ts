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
     * @param additionalAttributes additional non-style attributes
     * @param styleAttributes the supported style attributes
     */
    constructor(additionalAttributes: AttributeConfig[], additionalStyleAttributes: AttributeConfig[]) {
        super(additionalAttributes, [...defaultStyleAttributes, ...additionalStyleAttributes]);
    }
}
