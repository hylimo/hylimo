import { ExecutableAbstractFunctionExpression, fun, numberType } from "@hylimo/core";
import { Size, AbsolutePoint, Element, Point, DefaultEditTypes } from "@hylimo/diagram-common";
import { LayoutElement } from "../../layoutElement.js";
import { Layout } from "../../layoutEngine.js";
import { CanvasPointLayoutConfig } from "./canvasPointLayoutConfig.js";

/**
 * Layout config for absolute points
 */
export class AbsolutePointLayoutConfig extends CanvasPointLayoutConfig {
    override type = AbsolutePoint.TYPE;

    constructor() {
        super(
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
            ],
            []
        );
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const xFieldEntry = element.element.getLocalFieldOrUndefined("_x");
        const yFieldEntry = element.element.getLocalFieldOrUndefined("_y");
        const result: AbsolutePoint = {
            type: AbsolutePoint.TYPE,
            id,
            x: xFieldEntry?.value?.toNative() + position.x,
            y: yFieldEntry?.value.toNative() + position.y,
            children: [],
            edits: element.edits
        };
        return [result];
    }

    override createPrototype(): ExecutableAbstractFunctionExpression {
        return fun(
            `
                elementProto = object(proto = it)

                elementProto.defineProperty("x") {
                    args.self._x
                } {
                    args.self._x = it
                    args.self.edits.set("${DefaultEditTypes.MOVE_TRANSLATE_X}", createAdditiveEdit(it, "{ \\"var\\": \\"dx\\" }"))
                }
                elementProto.defineProperty("y") {
                    args.self._y
                } {
                    args.self._y = it
                    args.self.edits.set("${DefaultEditTypes.MOVE_TRANSLATE_Y}", createAdditiveEdit(it, "{ \\"var\\": \\"dy\\" }"))
                }
                
                elementProto
            `
        );
    }
}
