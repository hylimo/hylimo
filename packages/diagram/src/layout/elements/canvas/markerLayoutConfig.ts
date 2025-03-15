import type { FullObject } from "@hylimo/core";
import { numberType } from "@hylimo/core";
import type { Size, Point, Element } from "@hylimo/diagram-common";
import { Marker } from "@hylimo/diagram-common";
import type { LayoutElement, SizeConstraints } from "../../layoutElement.js";
import { ContentCardinality } from "../../layoutElement.js";
import type { Layout } from "../../engine/layout.js";
import { StyledElementLayoutConfig } from "../styledElementLayoutConfig.js";
import { simpleElementType } from "../../../module/base/types.js";

/**
 * Layout config for marker
 */
export class MarkerLayoutConfig extends StyledElementLayoutConfig {
    override type = Marker.TYPE;

    constructor() {
        super(
            [],
            [
                {
                    name: "lineStart",
                    description: "The relative (0..1) offset where the line starts in the marker",
                    type: numberType
                },
                {
                    name: "refX",
                    description: "The x coordinate of the reference point",
                    type: numberType
                },
                {
                    name: "refY",
                    description: "The y coordinate of the reference point",
                    type: numberType
                }
            ],
            simpleElementType,
            ContentCardinality.ExactlyOne
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const content = element.children[0];
        const contentElement = layout.measure(content, constraints);
        return contentElement.measuredSize!;
    }

    override layout(layout: Layout, element: LayoutElement, _position: Point, size: Size, id: string): Element[] {
        const content = element.children[0];
        const refX = element.styles.refX ?? 1;
        const refY = element.styles.refY ?? 0.5;
        const result: Marker = {
            type: Marker.TYPE,
            id,
            ...size,
            lineStart: element.styles.lineStart ?? 0,
            refX,
            refY,
            children: layout.layout(content, { x: -size.width * refX, y: -size.height * refY }, size),
            pos: element.position,
            edits: element.edits
        };
        return [result];
    }

    override getChildren(element: LayoutElement): FullObject[] {
        const content = element.element.getLocalFieldOrUndefined("content")?.value as FullObject;
        return [content];
    }
}
