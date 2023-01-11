import { numberType } from "@hylimo/core";
import { Size, AbsolutePoint, Element } from "@hylimo/diagram-common";
import { Point } from "sprotty-protocol";
import { LayoutElement } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { CanvasPointLayoutConfig } from "./canvasPointLayoutConfig";

/**
 * Layout config for absolute points
 */
export class AbsolutePointLayoutConfig extends CanvasPointLayoutConfig {
    constructor() {
        super(
            "absolutePoint",
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
        const xFieldEntry = element.element.getLocalFieldOrUndefined("x");
        const yFieldEntry = element.element.getLocalFieldOrUndefined("y");
        const result: AbsolutePoint = {
            type: "absolutePoint",
            id,
            x: xFieldEntry?.value?.toNative(),
            y: yFieldEntry?.value.toNative(),
            editable: !!xFieldEntry?.source && !!yFieldEntry?.source,
            children: []
        };
        return [result];
    }
}
