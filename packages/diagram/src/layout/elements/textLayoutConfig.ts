import { FullObject, listType, literal, objectToList, objectType, SemanticFieldNames } from "@hylimo/core";
import { Point } from "sprotty-protocol";
import { Element } from "../../model/base";
import { Text } from "../../model/model";
import { LayoutElement, Size, SizeConstraints } from "../layoutElement";
import { Layout } from "../layoutEngine";
import { StyledElementLayoutConfig } from "./styledElementLayoutConfig";

/**
 * Layout config for text
 */
export class TextLayoutConfig extends StyledElementLayoutConfig {
    constructor() {
        super(
            "text",
            [
                {
                    name: "contents",
                    description: "a list of spans to display",
                    type: listType(
                        objectType(
                            new Map([
                                [SemanticFieldNames.PROTO, objectType(new Map([["_type", literal("element")]]))],
                                ["type", literal("span")]
                            ])
                        )
                    )
                }
            ],
            []
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const contents = this.getContents(element);
        if (contents.length > 0) {
            element.contents = contents.map((content) => layout.measure(content, element, constraints));
            const layoutRes = layout.engine.textLayouter.layout(element, layout.fonts, constraints.max.width);
            element.layoutedContents = layoutRes.elements;
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
