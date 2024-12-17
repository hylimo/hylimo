import { Type } from "@hylimo/core";
import { AttributeConfig, ContentCardinality } from "../layoutElement.js";
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
     * @param contentType the type of the contents attribute
     * @param contentCardinality the cardinality of the contents attribute
     */
    constructor(
        additionalAttributes: AttributeConfig[],
        additionalStyleAttributes: AttributeConfig[],
        contentType: Type,
        contentCardinality: ContentCardinality
    ) {
        super(
            additionalAttributes,
            [...defaultStyleAttributes, ...additionalStyleAttributes],
            contentType,
            contentCardinality
        );
    }
}
