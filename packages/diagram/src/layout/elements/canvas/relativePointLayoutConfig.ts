import { FullObject, literal, numberType, objectType, SemanticFieldNames } from "@hylimo/core";
import { Size, Element, RelativePoint } from "@hylimo/diagram-common";
import { Point } from "sprotty-protocol";
import { canvasPointType } from "../../../module/types";
import { LayoutElement } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { CanvasPointLayoutConfig } from "./canvasPointLayoutConfig";

/**
 * Layout config for relative points
 */
export class RelativePointLayoutConfig extends CanvasPointLayoutConfig {
    constructor() {
        super(
            RelativePoint.TYPE,
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
                    description: "the target point ofh which the relative point is based",
                    type: canvasPointType
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
            editable: this.generateEditableNumbers(offsetXFieldEntry?.source, offsetYFieldEntry?.source),
            children: []
        };
        return [result];
    }
}
