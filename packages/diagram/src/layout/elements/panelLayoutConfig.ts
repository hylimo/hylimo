import { FullObject, objectToList } from "@hylimo/core";
import { AttributeConfig, ContentCardinality, LayoutElement } from "../layoutElement.js";
import { StyledElementLayoutConfig } from "./styledElementLayoutConfig.js";
import { elementType } from "../../module/base/types.js";
import { Point, Size, Line } from "@hylimo/diagram-common";
import { Layout } from "../engine/layout.js";

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

    override outline(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Line {
        const contents = element.contents as LayoutElement[];
        if (contents.length == 1) {
            return layout.outline(contents[0]);
        }
        return super.outline(layout, element, position, size, id);
    }
}
