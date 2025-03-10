import type { FullObject, ExecutableAbstractFunctionExpression } from "@hylimo/core";
import { numberType, optional, fun } from "@hylimo/core";
import type { Size, Point, Element } from "@hylimo/diagram-common";
import { CanvasElement, DefaultEditTypes } from "@hylimo/diagram-common";
import { canvasPointType, simpleElementType } from "../../../module/base/types.js";
import type { LayoutElement, SizeConstraints } from "../../layoutElement.js";
import { ContentCardinality, HorizontalAlignment, VerticalAlignment } from "../../layoutElement.js";
import type { Layout } from "../../engine/layout.js";
import { alignStyleAttributes, sizeStyleAttributes, visibilityStyleAttributes } from "../attributes.js";
import { EditableCanvasContentLayoutConfig } from "./editableCanvasContentLayoutConfig.js";

/**
 * Layout config for canvas element
 */
export class CanvasElementLayoutConfig extends EditableCanvasContentLayoutConfig {
    override isLayoutContent = false;
    override type = CanvasElement.TYPE;
    override idGroup = "e";

    constructor() {
        super(
            [
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
                ...sizeStyleAttributes,
                ...visibilityStyleAttributes
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

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const content = element.children[0];
        let dx = 0;
        const hAlign = element.styles.hAlign;
        if (hAlign === HorizontalAlignment.RIGHT) {
            dx = -size.width;
        } else if (hAlign === HorizontalAlignment.CENTER) {
            dx = -size.width / 2;
        }
        let dy = 0;
        const vAlign = element.styles.vAlign;
        if (vAlign === VerticalAlignment.BOTTOM) {
            dy = -size.height;
        } else if (vAlign === VerticalAlignment.CENTER) {
            dy = -size.height / 2;
        }

        const result: CanvasElement = {
            id,
            type: CanvasElement.TYPE,
            ...size,
            dx,
            dy,
            pos: this.extractPos(layout, element),
            rotation: element.element.getLocalFieldOrUndefined("_rotation")?.value?.toNative() ?? 0,
            children: layout.layout(content, { x: dx, y: dy }, size),
            outline: layout.outline(content),
            edits: element.edits,
            editExpression: element.element.getLocalFieldOrUndefined("editExpression")?.value?.toNative()
        };
        return [result];
    }

    override getChildren(element: LayoutElement): FullObject[] {
        const content = element.element.getLocalFieldOrUndefined("content")?.value as FullObject;
        return [content];
    }

    /**
     * Extracts the position from the element
     * If the element has a pos field, the position is extracted.
     *
     * @param layout the layout engine
     * @param element the element from which the position should be extracted
     * @returns the extracted position
     */
    private extractPos(layout: Layout, element: LayoutElement): string | undefined {
        const pos = element.element.getLocalFieldOrUndefined("pos")?.value as FullObject | undefined;
        if (pos == undefined) {
            return undefined;
        } else {
            const posId = layout.getElementId(pos);
            if (!layout.isChildElement(element.parent!, layout.layoutElementLookup.get(posId)!)) {
                throw new Error("The pos of a canvas element must be part of the same canvas or a sub-canvas");
            }
            return posId;
        }
    }

    override createPrototype(): ExecutableAbstractFunctionExpression {
        return fun(
            `
                elementProto = [proto = it]

                elementProto.defineProperty("width") {
                    args.self._width
                } {
                    args.self._width = it
                    args.self.edits["${DefaultEditTypes.RESIZE_WIDTH}"] = createAdditiveEdit(it, "dw")
                }
                elementProto.defineProperty("height") {
                    args.self._height
                } {
                    args.self._height = it
                    args.self.edits["${DefaultEditTypes.RESIZE_HEIGHT}"] = createAdditiveEdit(it, "dh")
                }
                elementProto.defineProperty("rotation") {
                    args.self._rotation
                } {
                    args.self._rotation = it
                    args.self.edits["${DefaultEditTypes.ROTATE}"] = createReplaceEdit(it, "$string(rotation)")
                }
                
                elementProto
            `
        );
    }
}
