import { optional, objectType } from "@hylimo/core";
import { AttributeConfig } from "../../layoutElement";
import { CanvasContentLayoutConfig } from "./canvasContentLayoutConfig";
import { elementType } from "../../../module/types";

/**
 * Base layout config for CanvasElementLayoutConfig and CanvasConnectionLayoutConfig
 */
export abstract class EditableCanvasContentLayoutConfig extends CanvasContentLayoutConfig {
    /**
     * Creates a CanvasCoEditableCanvasContentLayoutConfigntentLayoutconfig
     *
     * @param type the supported type
     * @param additionalAttributes additional non-style attributes
     * @param styleAttributes the supported style attributes
     */
    constructor(type: string, additionalAttributes: AttributeConfig[], styleAttributes: AttributeConfig[]) {
        super(
            type,
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
