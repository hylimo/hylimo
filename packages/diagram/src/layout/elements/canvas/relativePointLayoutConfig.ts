import { ExecutableAbstractFunctionExpression, FullObject, fun, numberType, optional, or } from "@hylimo/core";
import { Size, Element, RelativePoint, Point, CanvasElement, DefaultEditTypes } from "@hylimo/diagram-common";
import { canvasPointType, elementType } from "../../../module/base/types.js";
import { LayoutElement } from "../../layoutElement.js";
import { Layout } from "../../engine/layout.js";
import { CanvasPointLayoutConfig } from "./canvasPointLayoutConfig.js";

/**
 * Layout config for relative points
 */
export class RelativePointLayoutConfig extends CanvasPointLayoutConfig {
    override type = RelativePoint.TYPE;

    constructor() {
        super(
            [
                {
                    name: "offsetX",
                    description: "the x offset",
                    type: optional(numberType)
                },
                {
                    name: "offsetY",
                    description: "the y offset",
                    type: optional(numberType)
                },
                {
                    name: "target",
                    description: "the target point or canvas element of which the relative point is based",
                    type: or(canvasPointType, elementType(CanvasElement.TYPE))
                }
            ],
            []
        );
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const offsetXValue = element.element.getLocalFieldOrUndefined("_offsetX");
        const offsetYValue = element.element.getLocalFieldOrUndefined("_offsetY");
        const target = layout.getElementId(element.element.getLocalFieldOrUndefined("target")!.value as FullObject);
        const result: RelativePoint = {
            type: RelativePoint.TYPE,
            id,
            offsetX: offsetXValue?.value?.toNative() ?? 0,
            offsetY: offsetYValue?.value?.toNative() ?? 0,
            target,
            children: [],
            edits: element.edits
        };
        return [result];
    }

    override createPrototype(): ExecutableAbstractFunctionExpression {
        return fun(
            `
                elementProto = object(proto = it)

                elementProto.defineProperty("offsetX") {
                    args.self._offsetX
                } {
                    args.self._offsetX = it
                    args.self.edits.set("${DefaultEditTypes.MOVE_X}", createAdditiveEdit(it, "dx"))
                }
                elementProto.defineProperty("offsetY") {
                    args.self._offsetY
                } {
                    args.self._offsetY = it
                    args.self.edits.set("${DefaultEditTypes.MOVE_Y}", createAdditiveEdit(it, "dy"))
                }
                
                elementProto
            `
        );
    }
}
