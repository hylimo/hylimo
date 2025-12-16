import type { FullObject } from "@hylimo/core";
import { finiteNumberType, objectToList } from "@hylimo/core";
import type { Size, Point, Element } from "@hylimo/diagram-common";
import { Marker } from "@hylimo/diagram-common";
import type { LayoutElement, SizeConstraints } from "../../layoutElement.js";
import { ContentCardinality } from "../../layoutElement.js";
import type { Layout } from "../../engine/layout.js";
import { StyledElementLayoutConfig } from "../styledElementLayoutConfig.js";
import { simpleElementType } from "../../../module/base/types.js";
import { containerStyleAttributes } from "../attributes.js";
import { getContentLayoutConfig } from "../layout/contentLayout.js";

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
                    type: finiteNumberType
                },
                {
                    name: "refX",
                    description: "The x coordinate of the reference point",
                    type: finiteNumberType
                },
                {
                    name: "refY",
                    description: "The y coordinate of the reference point",
                    type: finiteNumberType
                },
                ...containerStyleAttributes
            ],
            simpleElementType,
            ContentCardinality.Many
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        return getContentLayoutConfig(element).measure(layout, element, constraints);
    }

    override layout(layout: Layout, element: LayoutElement, _position: Point, size: Size, id: string): Element[] {
        const contentLayoutConfig = getContentLayoutConfig(element);
        const refX = element.styles.refX ?? 1;
        const refY = element.styles.refY ?? 0.5;
        const result: Marker = {
            type: Marker.TYPE,
            id,
            ...size,
            lineStart: element.styles.lineStart ?? 0,
            refX,
            refY,
            children: contentLayoutConfig.layout(
                layout,
                element,
                { x: -size.width * refX, y: -size.height * refY },
                size,
                id
            ),
            pos: element.position,
            edits: element.edits
        };
        return [result];
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
