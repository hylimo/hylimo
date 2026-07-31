import { objectToList, type FullObject } from "@hylimo/core";
import type { Size, Point, Element } from "@hylimo/diagram-common";
import type { Layout } from "../engine/layout.js";
import {
    addPadding,
    addPaddingToPosition,
    ContentCardinality,
    extractPadding,
    removePadding,
    removePaddingFromConstraints,
    type LayoutElement,
    type SizeConstraints
} from "../layoutElement.js";
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
        const padding = extractPadding(element.styles);
        const contents = getContentLayoutConfig(element).measure(
            layout,
            element,
            removePaddingFromConstraints(constraints, padding)
        );
        return addPadding(contents, padding);
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const padding = extractPadding(element.styles);
        return getContentLayoutConfig(element).layout(
            layout,
            element,
            addPaddingToPosition(position, padding),
            removePadding(size, padding),
            id
        );
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
