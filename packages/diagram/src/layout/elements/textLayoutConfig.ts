import type { FullObject } from "@hylimo/core";
import { objectToList } from "@hylimo/core";
import type { Element, Size, Point } from "@hylimo/diagram-common";
import { Text } from "@hylimo/diagram-common";
import type { LayoutElement, SizeConstraints } from "../layoutElement.js";
import { ContentCardinality } from "../layoutElement.js";
import type { Layout } from "../engine/layout.js";
import { StyledElementLayoutConfig } from "./styledElementLayoutConfig.js";
import { elementType } from "../../module/base/types.js";

/**
 * Layout config for text
 */
export class TextLayoutConfig extends StyledElementLayoutConfig {
    override type = Text.TYPE;

    constructor() {
        super([], [], elementType("span"), ContentCardinality.Many);
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const contents = element.children;
        if (contents.length > 0) {
            contents.forEach((content) => layout.measure(content, constraints));
            const layoutRes = layout.engine.textCache.getOrCompute(
                {
                    maxWidth: constraints.max.width,
                    spans: element.children.map((content) => content.styles)
                },
                () => {
                    return layout.engine.textLayouter.layout(element, layout.fonts, constraints.max.width);
                }
            );
            element.layoutedContents = layoutRes.elements.map((element) => ({ ...element }));
            return layoutRes.size;
        } else {
            return constraints.min;
        }
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        if (element.isHidden || element.children.length === 0) {
            return [];
        }
        const elements = element.layoutedContents as Text[];
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            element.id = `${id}_${i}`;
            element.x += position.x;
            element.y += position.y;
        }
        return elements;
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
