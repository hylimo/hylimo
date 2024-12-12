import { Expression, optional, wrapperObjectType } from "@hylimo/core";
import { AttributeConfig } from "../../layoutElement.js";
import { CanvasContentLayoutConfig } from "./canvasContentLayoutConfig.js";

/**
 * Base layout config for CanvasElementLayoutConfig and CanvasConnectionLayoutConfig
 */
export abstract class EditableCanvasContentLayoutConfig extends CanvasContentLayoutConfig {
    /**
     * Creates a CanvasCoEditableCanvasContentLayoutConfigntentLayoutconfig
     *
     * @param additionalAttributes additional non-style attributes
     * @param styleAttributes the supported style attributes
     */
    constructor(additionalAttributes: AttributeConfig[], styleAttributes: AttributeConfig[]) {
        super(
            [
                {
                    name: "source",
                    description: "the CanvasContent itself, used for the metadata",
                    type: optional(wrapperObjectType("Expression", (value) => value.wrapped instanceof Expression))
                },
                ...additionalAttributes
            ],
            styleAttributes
        );
    }
}
