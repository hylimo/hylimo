import type { FullObject, ExecutableAbstractFunctionExpression } from "@hylimo/core";
import { numberType, optional, fun, objectToList } from "@hylimo/core";
import type { Size, Point, Element } from "@hylimo/diagram-common";
import { CanvasElement, DefaultEditTypes } from "@hylimo/diagram-common";
import { canvasPointType, simpleElementType } from "../../../module/base/types.js";
import type { LayoutElement, SizeConstraints } from "../../layoutElement.js";
import { ContentCardinality, HorizontalAlignment, VerticalAlignment } from "../../layoutElement.js";
import type { Layout } from "../../engine/layout.js";
import {
    alignStyleAttributes,
    containerStyleAttributes,
    sizeStyleAttributes,
    visibilityStyleAttributes
} from "../attributes.js";
import { EditableCanvasContentLayoutConfig } from "./editableCanvasContentLayoutConfig.js";
import { getContentLayoutConfig } from "../layout/contentLayout.js";

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
                ...visibilityStyleAttributes,
                ...containerStyleAttributes
            ],
            simpleElementType,
            ContentCardinality.Many
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        return getContentLayoutConfig(element).measure(layout, element, constraints);
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const contentLayoutConfig = getContentLayoutConfig(element);
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

        const contentPosition = {
            x: dx,
            y: dy
        };
        const result: CanvasElement = {
            id,
            type: CanvasElement.TYPE,
            ...size,
            dx,
            dy,
            pos: this.extractPos(layout, element),
            rotation: element.element.getLocalFieldOrUndefined("_rotation")?.value?.toNative() ?? 0,
            children: contentLayoutConfig.layout(layout, element, contentPosition, size, id),
            outline: contentLayoutConfig.outline(layout, element, contentPosition, size, id),
            edits: element.edits,
            editExpression: element.element.getLocalFieldOrUndefined("editExpression")?.value?.toNative()
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
