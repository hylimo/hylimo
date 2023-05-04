import { FullObject, objectToList } from "@hylimo/core";
import { AttributeConfig, ContentCardinality, LayoutElement } from "../layoutElement";
import { StyledElementLayoutConfig } from "./styledElementLayoutConfig";
import { elementType } from "../../module/types";

/**
 * Base class for all layout configs which contain contents
 */
export abstract class PanelLayoutConfig extends StyledElementLayoutConfig {
    override contentType = elementType();
    override contentCardinality = ContentCardinality.Many;

    /**
     * Creates a new StyledElementLayoutConfig
     *
     * @param additionalAttributes additional non-style attributes
     * @param styleAttributes the supported style attributes
     */
    constructor(additionalAttributes: AttributeConfig[], additionalStyleAttributes: AttributeConfig[]) {
        super(additionalAttributes, additionalStyleAttributes);
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
