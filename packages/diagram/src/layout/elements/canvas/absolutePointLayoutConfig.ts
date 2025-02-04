import { ExecutableAbstractFunctionExpression, fun, numberType } from "@hylimo/core";
import { Size, AbsolutePoint, Element, Point, DefaultEditTypes } from "@hylimo/diagram-common";
import { LayoutElement } from "../../layoutElement.js";
import { Layout } from "../../engine/layout.js";
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
                    type: numberType
                },
                {
                    name: "y",
                    description: "the y coordinate",
                    type: numberType
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
