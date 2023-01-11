import { FullObject, literal, numberType, objectType, SemanticFieldNames } from "@hylimo/core";
import { Size, Element, RelativePoint } from "@hylimo/diagram-common";
import { Point } from "sprotty-protocol";
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
                    name: "xOffset",
                    description: "the x offset",
                    type: numberType
                },
                {
                    name: "yOffset",
                    description: "the y offset",
                    type: numberType
                },
                {
                    name: "target",
                    description: "the target point ofh which the relative point is based",
                    type: objectType(
                        new Map([[SemanticFieldNames.PROTO, objectType(new Map([["_type", literal("element")]]))]])
                    )
                }
            ],
            []
        );
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const xOffsetFieldEntry = element.element.getLocalFieldOrUndefined("offsetX");
        const yOffsetFieldEntry = element.element.getLocalFieldOrUndefined("offsetY");
        const target = this.getContentId(
            element,
            element.element.getLocalFieldOrUndefined("target")!.value as FullObject
        );
        const result: RelativePoint = {
            type: RelativePoint.TYPE,
            id,
            offsetX: xOffsetFieldEntry?.value?.toNative(),
            offsetY: yOffsetFieldEntry?.value.toNative(),
            target,
            editable: !!xOffsetFieldEntry?.source && !!yOffsetFieldEntry?.source,
            children: []
        };
        return [result];
    }
}
