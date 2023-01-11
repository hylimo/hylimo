import {
    FullObject,
    listType,
    literal,
    objectToList,
    objectType,
    RuntimeError,
    SemanticFieldNames
} from "@hylimo/core";
import { Size, Point, Element, Canvas } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { StyledElementLayoutConfig } from "../styledElementLayoutConfig";

/**
 * Layout config for the canvas
 */
export class CanvasLayoutConfig extends StyledElementLayoutConfig {
    constructor() {
        super(
            "canvas",
            [
                {
                    name: "contents",
                    description: "the inner elements",
                    type: listType(
                        objectType(
                            new Map([[SemanticFieldNames.PROTO, objectType(new Map([["_type", literal("element")]]))]])
                        )
                    )
                }
            ],
            []
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        // TODO (maybe) better size calculation
        const contents = this.getContents(element);
        element.contents = contents.map((content) =>
            layout.measure(content, element, { min: { width: 0, height: 0 }, max: constraints.max })
        );
        return constraints.max;
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const contents = element.contents as LayoutElement[];
        const contentIdLookup = new Map<FullObject, string>();
        for (let i = 0; i < contents.length; i++) {
            contentIdLookup.set(contents[i].element, `${id}_${i}`);
        }
        element.contentIdLookup = contentIdLookup;
        const result: Canvas = {
            type: "canvas",
            id,
            ...position,
            ...size,
            children: contents.flatMap((content) =>
                layout.layout(content, position, content.measuredSize!, contentIdLookup.get(content.element)!)
            )
        };
        return [result];
    }

    /**
     * Gets the contents of a panel
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
