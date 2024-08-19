import { FullObject, numberType, optional, ExecutableAbstractFunctionExpression, fun } from "@hylimo/core";
import { Size, Point, Element, CanvasElement } from "@hylimo/diagram-common";
import { canvasPointType, elementType } from "../../../module/types.js";
import {
    ContentCardinality,
    HorizontalAlignment,
    LayoutElement,
    SizeConstraints,
    VerticalAlignment
} from "../../layoutElement.js";
import { Layout } from "../../layoutEngine.js";
import { alignStyleAttributes, sizeStyleAttributes } from "../attributes.js";
import { EditableCanvasContentLayoutConfig } from "./editableCanvasContentLayoutConfig.js";

/**
 * Layout config for canvas element
 */
export class CanvasElementLayoutConfig extends EditableCanvasContentLayoutConfig {
    override isLayoutContent = false;
    override type = CanvasElement.TYPE;
    override contentType = elementType();
    override contentCardinality = ContentCardinality.ExactlyOne;

    constructor() {
        super(
            [
                {
                    name: "content",
                    description: "the inner element",
                    type: elementType()
                },
                {
                    name: "pos",
                    description: "the position of the canvasElement",
                    type: optional(canvasPointType)
                }
            ],
            [
                ...alignStyleAttributes,
                {
                    name: "rotation",
                    description: "the rotation in degrees",
                    type: numberType
                },
                ...sizeStyleAttributes
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
            pos: this.extractPos(element),
            rotation: element.styles.rotation ?? 0,
            children: layout.layout(content, { x, y }, size, `${id}_0`),
            outline: content.layoutConfig.outline(
                layout,
                content,
                content.layoutBounds!.position,
                content.layoutBounds!.size
            ),
            edits: element.edits
        };
        return [result];
    }

    /**
     * Extracts the position from the element
     * If the element has a pos field, the position is extracted.
     *
     * @param element the element from which the position should be extracted
     * @returns the extracted position
     */
    private extractPos(element: LayoutElement): string | undefined {
        const pos = element.element.getLocalFieldOrUndefined("pos")?.value as FullObject | undefined;
        if (pos == undefined) {
            return undefined;
        } else {
            return this.getContentId(element, pos);
        }
    }

    override createPrototype(): ExecutableAbstractFunctionExpression {
        return fun(
            `
                elementProto = object(proto = it)

                elementProto.defineProperty("width") {
                    args.self._width
                } {
                    args.self._width = it
                }
                elementProto.defineProperty("height") {
                    args.self._height
                } {
                    args.self._height = it
                }
                elementProto.defineProperty("rotation") {
                    args.self._rotation
                } {
                    args.self._rotation = it
                }
                
                elementProto
            `
        );
    }
}
