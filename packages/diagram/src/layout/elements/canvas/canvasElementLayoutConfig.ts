import { objectType, SemanticFieldNames, literal, FullObject, numberType } from "@hylimo/core";
import { Size, Point, Element, CanvasElement } from "@hylimo/diagram-common";
import { canvasPointType } from "../../../module/types";
import { HorizontalAlignment, LayoutElement, SizeConstraints, VerticalAlignment } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { alignStyleAttributes } from "../attributes";
import { EditableCanvasContentLayoutConfig } from "./editableCanvasContentLayoutConfig";

/**
 * Layout config for canvas element
 */
export class CanvasElementLayoutConfig extends EditableCanvasContentLayoutConfig {
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
            [
                ...alignStyleAttributes,
                {
                    name: "rotation",
                    description: "the rotation in degrees",
                    type: numberType
                }
            ]
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
        let x = 0;
        const hAlign = element.styles.hAlign;
        if (hAlign === HorizontalAlignment.RIGHT) {
            x = -size.width;
        } else if (hAlign === HorizontalAlignment.CENTER) {
            x = -size.width / 2;
        }
        let y = 0;
        const vAlign = element.styles.vAlign;
        if (vAlign === VerticalAlignment.BOTTOM) {
            y = -size.height;
        } else if (vAlign === VerticalAlignment.CENTER) {
            y = -size.height / 2;
        }
        const result: CanvasElement = {
            id,
            type: CanvasElement.TYPE,
            ...size,
            x,
            y,
            rotation: element.styles.rotation ?? 0,
            children: layout.layout(content, Point.ORIGIN, size, `${id}_0`),
            pos: this.getContentId(element, element.element.getLocalFieldOrUndefined("pos")?.value as FullObject),
            resizable: undefined, //TODO fix
            rotateable: this.generateEditableNumbers(element.styleSources.get("rotation")?.source),
            outline: content.layoutConfig.outline(
                layout,
                content,
                content.layoutBounds!.position,
                content.layoutBounds!.size
            )
        };
        return [result];
    }
}
