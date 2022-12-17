import { FullObject, listType, literal, objectToList, objectType, SemanticFieldNames } from "@hylimo/core";
import { AttributeConfig, LayoutElement } from "../layoutElement";
import { StyledElementLayoutConfig } from "./styledElementLayoutConfig";

/**
 * Base class for all layout configs which contain contents
 */
export abstract class PanelLayoutConfig extends StyledElementLayoutConfig {
    /**
     * Creates a new StyledElementLayoutConfig
     *
     * @param type the supported type
     * @param additionalAttributes additional non-style attributes
     * @param styleAttributes the supported style attributes
     */
    constructor(type: string, additionalAttributes: AttributeConfig[], additionalStyleAttributes: AttributeConfig[]) {
        super(
            type,
            [
                {
                    name: "contents",
                    description: "the inner elements",
                    type: listType(
                        objectType(
                            new Map([[SemanticFieldNames.PROTO, objectType(new Map([["_type", literal("element")]]))]])
                        )
                    )
                },
                ...additionalAttributes
            ],
            additionalAttributes
        );
    }

    /**
     * Gets the contents of a panel
     *
     * @param element the element containing the contents
     * @returns the contents
     */
    getContents(element: LayoutElement): FullObject[] {
        const contents = element.element.getLocalFieldOrUndefined("contents")?.value as FullObject | undefined;
        if (contents) {
            return objectToList(contents) as FullObject[];
        } else {
            return [];
        }
    }
}
