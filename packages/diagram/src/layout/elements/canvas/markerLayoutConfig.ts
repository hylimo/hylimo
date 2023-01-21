import { FullObject, literal, numberType, objectType, SemanticFieldNames } from "@hylimo/core";
import { Size, Point, Element, Marker } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { StyledElementLayoutConfig } from "../styledElementLayoutConfig";

/**
 * Layout config for marker
 */
export class MarkerLayoutConfig extends StyledElementLayoutConfig {
    constructor() {
        super(
            Marker.TYPE,
            [
                {
                    name: "content",
                    description: "the inner element",
                    type: objectType(
                        new Map([[SemanticFieldNames.PROTO, objectType(new Map([["_type", literal("element")]]))]])
                    )
                }
            ],
            [
                {
                    name: "lineStartOffset",
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
            lineStartOffset: element.styles.lineStartOffset,
            children: layout.layout(content, { x: 0, y: 0 }, size, `${id}_0`)
        };
        return [result];
    }
}
