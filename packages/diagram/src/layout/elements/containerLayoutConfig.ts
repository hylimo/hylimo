import { objectToList, type FullObject } from "@hylimo/core";
import type { Size, Point, Element } from "@hylimo/diagram-common";
import type { Layout } from "../engine/layout.js";
import { ContentCardinality, type LayoutElement, type SizeConstraints } from "../layoutElement.js";
import { StyledElementLayoutConfig } from "./styledElementLayoutConfig.js";
import { getContentLayoutConfig } from "./layout/contentLayout.js";
import { containerStyleAttributes } from "./attributes.js";
import { simpleElementType } from "../../module/base/types.js";

/**
 * Layout config for container
 */
export class ContainerLayoutConfig extends StyledElementLayoutConfig {
    override type = "container";

    constructor() {
        super([], containerStyleAttributes, simpleElementType, ContentCardinality.Many);
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        return getContentLayoutConfig(element).measure(layout, element, constraints);
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        return getContentLayoutConfig(element).layout(layout, element, position, size, id);
    }

    override getChildren(element: LayoutElement): FullObject[] {
        const contents = element.element.getLocalFieldOrUndefined("contents")?.value as FullObject | undefined;
        if (contents) {
            return objectToList(contents) as FullObject[];
        } else {
            return [];
        }
    }
}
