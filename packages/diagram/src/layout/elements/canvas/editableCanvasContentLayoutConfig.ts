import { Expression, optional, Type, wrapperObjectType } from "@hylimo/core";
import { AttributeConfig, ContentCardinality } from "../../layoutElement.js";
import { CanvasContentLayoutConfig } from "./canvasContentLayoutConfig.js";

/**
 * Base layout config for CanvasElementLayoutConfig and CanvasConnectionLayoutConfig
 */
export abstract class EditableCanvasContentLayoutConfig extends CanvasContentLayoutConfig {
    /**
     * Creates a EditableCanvasContentLayoutConfig
     *
     * @param additionalAttributes additional non-style attributes
     * @param styleAttributes the supported style attributes
     * @param contentType the type of the contents attribute
     * @param contentCardinality the cardinality of the contents attribute
     */
    constructor(
        additionalAttributes: AttributeConfig[],
        styleAttributes: AttributeConfig[],
        contentType: Type,
        contentCardinality: ContentCardinality
    ) {
        super(
            [
                {
                    name: "source",
                    description: "the CanvasContent itself, used for the metadata",
                    type: optional(wrapperObjectType("Expression", (value) => value.wrapped instanceof Expression))
                },
                ...additionalAttributes
            ],
            styleAttributes,
            contentType,
            contentCardinality
        );
    }
}
