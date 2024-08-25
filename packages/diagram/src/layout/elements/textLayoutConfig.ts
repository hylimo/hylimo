import { FullObject, objectToList } from "@hylimo/core";
import { Element, Size, Point, Text } from "@hylimo/diagram-common";
import { ContentCardinality, LayoutElement, SizeConstraints } from "../layoutElement.js";
import { Layout } from "../layoutEngine.js";
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
        const contents = this.getContents(element);
        if (contents.length > 0) {
            element.contents = contents.map((content) => layout.measure(content, element, constraints));
            const layoutRes = layout.engine.textCache.getOrCompute(
                {
                    maxWidth: constraints.max.width,
                    spans: (element.contents as LayoutElement[]).map((content) => content.styles)
                },
                () => {
                    return layout.engine.textLayouter.layout(element, layout.fonts, constraints.max.width);
                }
            );
            element.layoutedContents = layoutRes.elements.map((element) => ({ ...element }));
            return layoutRes.size;
        } else {
            element.contents = [];
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

    /**
     * Gets the contents of a text
     *
     * @param element the element containing the contents
     * @returns the contents
     */
    private getContents(element: LayoutElement): FullObject[] {
        const contents = element.element.getLocalFieldOrUndefined("contents")?.value as FullObject | undefined;
        if (contents) {
            return objectToList(contents) as FullObject[];
        } else {
            return [];
        }
    }
}
