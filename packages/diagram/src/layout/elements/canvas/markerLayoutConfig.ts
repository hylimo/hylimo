import { FullObject, numberType } from "@hylimo/core";
import { Size, Point, Element, Marker } from "@hylimo/diagram-common";
import { ContentCardinality, LayoutElement, SizeConstraints } from "../../layoutElement.js";
import { Layout } from "../../layoutEngine.js";
import { StyledElementLayoutConfig } from "../styledElementLayoutConfig.js";
import { elementType } from "../../../module/types.js";

/**
 * Layout config for marker
 */
export class MarkerLayoutConfig extends StyledElementLayoutConfig {
    override type = Marker.TYPE;
    override contentType = elementType();
    override contentCardinality = ContentCardinality.ExactlyOne;

    constructor() {
        super(
            [
                {
                    name: "content",
                    description: "the inner element",
                    type: elementType()
                }
            ],
            [
                {
                    name: "lineStart",
                    description: "The relative (0..1) offset where the line starts in the marker",
                    type: numberType
                }
            ]
        );
    }

    measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        // TODO (maybe) better size calculation
        const content = element.element.getLocalFieldOrUndefined("content")?.value as FullObject;
        const contentElement = layout.measure(content, element, constraints);
        element.content = contentElement;
        return contentElement.measuredSize!;
    }

    layout(layout: Layout, element: LayoutElement, _position: Point, size: Size, id: string): Element[] {
        const content = element.content as LayoutElement;
        const result: Marker = {
            type: Marker.TYPE,
            id,
            ...size,
            lineStart: element.styles.lineStart ?? 0,
            children: layout.layout(content, { x: -size.width, y: -size.height / 2 }, size, `${id}_0`),
            pos: element.position,
            edits: element.edits
        };
        return [result];
    }
}
