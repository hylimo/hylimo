import { optional, objectType, SemanticFieldNames, literal } from "@hylimo/core";
import { AttributeConfig } from "../../layoutElement";
import { CanvasContentLayoutConfig } from "./canvasContentLayoutConfig";

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
                    type: optional(
                        objectType(
                            new Map([[SemanticFieldNames.PROTO, objectType(new Map([["_type", literal("element")]]))]])
                        )
                    )
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
