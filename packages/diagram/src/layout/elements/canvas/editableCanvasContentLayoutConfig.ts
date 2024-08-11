import { optional, objectType } from "@hylimo/core";
import { AttributeConfig } from "../../layoutElement.js";
import { CanvasContentLayoutConfig } from "./canvasContentLayoutConfig.js";
import { elementType } from "../../../module/types.js";

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
                    description:
                        "the CanvasContent itself, used for the metadata, should be assigned to an expression where infix functions can be added",
                    type: optional(elementType())
                },
                {
                    name: "scopes",
                    description: "function expressions which can be modified",
                    type: objectType()
                },
                ...additionalAttributes
            ],
            styleAttributes
        );
    }
}
