import type { ExecutableAbstractFunctionExpression, FullObject } from "@hylimo/core";
import { fun, finiteNumberType } from "@hylimo/core";
import type { Size, Element, Point } from "@hylimo/diagram-common";
import { RelativePoint, DefaultEditTypes } from "@hylimo/diagram-common";
import { canvasContentType } from "../../../module/base/types.js";
import type { LayoutElement } from "../../layoutElement.js";
import type { Layout } from "../../engine/layout.js";
import { CanvasPointLayoutConfig } from "./canvasPointLayoutConfig.js";

/**
 * Layout config for relative points
 */
export class RelativePointLayoutConfig extends CanvasPointLayoutConfig {
    override type = RelativePoint.TYPE;
    override idGroup = "pr";

    constructor() {
        super(
            [
                {
                    name: "targetX",
                    description: "the target point or canvas element of which the relative x-coordinate is based",
                    type: canvasContentType
                },
                {
                    name: "targetY",
                    description: "the target point or canvas element of which the relative y-coordinate is based",
                    type: canvasContentType
                }
            ],
            [
                {
                    name: "offsetX",
                    description: "the x offset",
                    type: finiteNumberType
                },
                {
                    name: "offsetY",
                    description: "the y offset",
                    type: finiteNumberType
                }
            ]
        );
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const offsetXValue = element.element.getLocalFieldOrUndefined("_offsetX");
        const offsetYValue = element.element.getLocalFieldOrUndefined("_offsetY");
        const targetX = layout.getElementId(element.element.getLocalFieldOrUndefined("targetX")!.value as FullObject);
        const targetY = layout.getElementId(element.element.getLocalFieldOrUndefined("targetY")!.value as FullObject);
        if (!layout.isChildElement(element.parent!, layout.layoutElementLookup.get(targetX)!)) {
            throw new Error("The x-target of a relative point must be part of the same canvas or a sub-canvas");
        }
        if (!layout.isChildElement(element.parent!, layout.layoutElementLookup.get(targetY)!)) {
            throw new Error("The y-target of a relative point must be part of the same canvas or a sub-canvas");
        }
        const result: RelativePoint = {
            type: RelativePoint.TYPE,
            id,
            offsetX: offsetXValue?.value?.toNative() ?? 0,
            offsetY: offsetYValue?.value?.toNative() ?? 0,
            targetX,
            targetY,
            children: [],
            edits: element.edits
        };
        return [result];
    }

    override createPrototype(): ExecutableAbstractFunctionExpression {
        return fun(
            `
                elementProto = [proto = it]

                elementProto.defineProperty("offsetX") {
                    args.self._offsetX
                } {
                    args.self._offsetX = it
                    args.self.edits["${DefaultEditTypes.MOVE_X}"] = createAdditiveEdit(it, "dx")
                }
                elementProto.defineProperty("offsetY") {
                    args.self._offsetY
                } {
                    args.self._offsetY = it
                    args.self.edits["${DefaultEditTypes.MOVE_Y}"] = createAdditiveEdit(it, "dy")
                }
                
                elementProto
            `
        );
    }
}
