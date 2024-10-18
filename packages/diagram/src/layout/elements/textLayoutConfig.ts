import { FullObject, objectToList } from "@hylimo/core";
import { Element, Size, Point, Text } from "@hylimo/diagram-common";
import { ContentCardinality, LayoutElement, SizeConstraints } from "../layoutElement.js";
import { Layout } from "../engine/layout.js";
import { StyledElementLayoutConfig } from "./styledElementLayoutConfig.js";
import { elementType } from "../../module/base/types.js";

/**
 * Layout config for text
 */
export class TextLayoutConfig extends StyledElementLayoutConfig {
    override type = Text.TYPE;
    override contentType = elementType("span");
    override contentCardinality = ContentCardinality.AtLeastOne;

    constructor() {
        super([], []);
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
        const elements = element.layoutedContents as Text[];
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            element.id = `${id}_${i}`;
            element.x += position.x;
            element.y += position.y;
        }
        return elements;
    }

    override getChildren(layout: Layout, element: LayoutElement): FullObject[] {
        const contents = element.element.getLocalFieldOrUndefined("contents")?.value as FullObject | undefined;
        if (contents) {
            return objectToList(contents) as FullObject[];
        } else {
            return [];
        }
    }
}
