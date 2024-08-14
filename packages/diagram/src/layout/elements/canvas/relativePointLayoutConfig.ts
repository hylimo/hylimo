import { FullObject, numberType, or } from "@hylimo/core";
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
        const offsetXFieldEntry = element.element.getLocalFieldOrUndefined("offsetX");
        const offsetYFieldEntry = element.element.getLocalFieldOrUndefined("offsetY");
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
            editable: this.generateModificationSpecification({
                offsetX: offsetXFieldEntry?.source,
                offsetY: offsetYFieldEntry?.source
            }),
            children: []
        };
        return [result];
    }
}
