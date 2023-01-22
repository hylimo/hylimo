import { objectType, SemanticFieldNames, literal, FullObject } from "@hylimo/core";
import { Size, Point, Element, CanvasElement } from "@hylimo/diagram-common";
import { canvasPointType } from "../../../module/types";
import { LayoutElement, SizeConstraints } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { CanvasContentLayoutConfig } from "./canvasContentLayoutConfig";

/**
 * Layout config for canvas element
 */
export class CanvasElementLayoutConfig extends CanvasContentLayoutConfig {
    override isLayoutContent = false;

    constructor() {
        super(
            CanvasElement.TYPE,
            [
                {
                    name: "content",
                    description: "the inner element",
                    type: objectType(
                        new Map([[SemanticFieldNames.PROTO, objectType(new Map([["_type", literal("element")]]))]])
                    )
                },
                {
                    name: "pos",
                    description: "the position of the canvasElement",
                    type: canvasPointType
                }
            ],
            []
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const content = element.element.getLocalFieldOrUndefined("content")?.value as FullObject;
        const contentElement = layout.measure(content, element, constraints);
        element.content = contentElement;
        return contentElement.measuredSize!;
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const content = element.content as LayoutElement;
        const result: CanvasElement = {
            id,
            type: CanvasElement.TYPE,
            ...size,
            children: layout.layout(content, { x: 0, y: 0 }, size, `${id}_0`),
            pos: this.getContentId(element, element.element.getLocalFieldOrUndefined("pos")?.value as FullObject),
            resizable: undefined //TODO fix
        };
        return [result];
    }
}
