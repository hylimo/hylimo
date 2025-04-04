import type { FullObject } from "@hylimo/core";
import { objectToList } from "@hylimo/core";
import type { AttributeConfig, LayoutElement } from "../layoutElement.js";
import { ContentCardinality } from "../layoutElement.js";
import { StyledElementLayoutConfig } from "./styledElementLayoutConfig.js";
import { simpleElementType } from "../../module/base/types.js";
import type { Point, Size, Line } from "@hylimo/diagram-common";
import type { Layout } from "../engine/layout.js";

/**
 * Base class for all layout configs which contain contents
 */
export abstract class PanelLayoutConfig extends StyledElementLayoutConfig {
    /**
     * Creates a new StyledElementLayoutConfig
     *
     * @param additionalAttributes additional non-style attributes
     * @param styleAttributes the supported style attributes
     */
    constructor(additionalAttributes: AttributeConfig[], additionalStyleAttributes: AttributeConfig[]) {
        super(additionalAttributes, additionalStyleAttributes, simpleElementType, ContentCardinality.Many);
    }

    override getChildren(element: LayoutElement): FullObject[] {
        const contents = element.element.getLocalFieldOrUndefined("contents")?.value as FullObject | undefined;
        if (contents) {
            return objectToList(contents) as FullObject[];
        } else {
            return [];
        }
    }

    override outline(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Line {
        const contents = element.children;
        if (contents.length == 1) {
            return layout.outline(contents[0]);
        }
        return super.outline(layout, element, position, size, id);
    }
}
