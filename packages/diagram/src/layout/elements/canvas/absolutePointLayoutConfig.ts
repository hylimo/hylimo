import { numberType } from "@hylimo/core";
import { Size, AbsolutePoint, Element, Point } from "@hylimo/diagram-common";
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
        const xFieldEntry = element.element.getLocalFieldOrUndefined("x");
        const yFieldEntry = element.element.getLocalFieldOrUndefined("y");
        const result: AbsolutePoint = {
            type: AbsolutePoint.TYPE,
            id,
            x: xFieldEntry?.value?.toNative() + position.x,
            y: yFieldEntry?.value.toNative() + position.y,
            editable: this.generateModificationSpecification({ x: xFieldEntry?.source, y: yFieldEntry?.source }),
            children: []
        };
        return [result];
    }
}
