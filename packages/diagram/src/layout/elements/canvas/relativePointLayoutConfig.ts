import { ExecutableAbstractFunctionExpression, FullObject, fun, numberType, or } from "@hylimo/core";
import { Size, Element, RelativePoint, Point, CanvasElement } from "@hylimo/diagram-common";
import { canvasPointType, elementType } from "../../../module/types.js";
import { LayoutElement } from "../../layoutElement.js";
import { Layout } from "../../layoutEngine.js";
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
                    type: numberType
                },
                {
                    name: "offsetY",
                    description: "the y offset",
                    type: numberType
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
        const offsetXFieldEntry = element.element.getLocalFieldOrUndefined("_offsetX");
        const offsetYFieldEntry = element.element.getLocalFieldOrUndefined("_offsetY");
        const target = this.getContentId(
            element,
            element.element.getLocalFieldOrUndefined("target")!.value as FullObject
        );
        const result: RelativePoint = {
            type: RelativePoint.TYPE,
            id,
            offsetX: offsetXFieldEntry?.value?.toNative(),
            offsetY: offsetYFieldEntry?.value.toNative(),
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
                }
                elementProto.defineProperty("offsetY") {
                    args.self._offsetY
                } {
                    args.self._offsetY = it
                }
                
                elementProto
            `
        );
    }
}
