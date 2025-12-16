import type { ExecutableAbstractFunctionExpression } from "@hylimo/core";
import { fun, finiteNumberType } from "@hylimo/core";
import type { Size, Element, Point } from "@hylimo/diagram-common";
import { AbsolutePoint, DefaultEditTypes } from "@hylimo/diagram-common";
import type { LayoutElement } from "../../layoutElement.js";
import type { Layout } from "../../engine/layout.js";
import { CanvasPointLayoutConfig } from "./canvasPointLayoutConfig.js";

/**
 * Layout config for absolute points
 */
export class AbsolutePointLayoutConfig extends CanvasPointLayoutConfig {
    override type = AbsolutePoint.TYPE;
    override idGroup = "pa";

    constructor() {
        super(
            [],
            [
                {
                    name: "x",
                    description: "the x coordinate",
                    type: finiteNumberType
                },
                {
                    name: "y",
                    description: "the y coordinate",
                    type: finiteNumberType
                }
            ]
        );
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const xValue = element.element.getLocalFieldOrUndefined("_x");
        const yValue = element.element.getLocalFieldOrUndefined("_y");
        const result: AbsolutePoint = {
            type: AbsolutePoint.TYPE,
            id,
            x: xValue?.value?.toNative() ?? 0,
            y: yValue?.value?.toNative() ?? 0,
            children: [],
            edits: element.edits
        };
        return [result];
    }

    override createPrototype(): ExecutableAbstractFunctionExpression {
        return fun(
            `
                elementProto = [proto = it]

                elementProto.defineProperty("x") {
                    args.self._x
                } {
                    args.self._x = it
                    args.self.edits["${DefaultEditTypes.MOVE_X}"] = createAdditiveEdit(it, "dx")
                }
                elementProto.defineProperty("y") {
                    args.self._y
                } {
                    args.self._y = it
                    args.self.edits["${DefaultEditTypes.MOVE_Y}"] = createAdditiveEdit(it, "dy")
                }
                
                elementProto
            `
        );
    }
}
