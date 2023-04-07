import { numberType } from "@hylimo/core";
import { CanvasAxisAlignedSegment, Point, Size, Element } from "@hylimo/diagram-common";
import { LayoutElement } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { CanvasConnectionSegmentLayoutConfig } from "./canvasConnectionSegmentLayoutConfig";

/**
 * Layout config for canvas line segments
 */
export class CanvasAxisAlignedSegmentLayoutConfig extends CanvasConnectionSegmentLayoutConfig {
    constructor() {
        super(
            CanvasAxisAlignedSegment.TYPE,
            [
                {
                    name: "verticalPos",
                    description: "The position on the x-axis where the vertical segment starts",
                    type: numberType
                }
            ],
            []
        );
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const verticalPosFieldEntry = element.element.getLocalFieldOrUndefined("verticalPos");
        const result: CanvasAxisAlignedSegment = {
            id,
            type: CanvasAxisAlignedSegment.TYPE,
            children: [],
            end: this.getContentId(element, "end"),
            pos: verticalPosFieldEntry?.value?.toNative(),
            editable: this.generateModificationSpecification({ verticalPos: verticalPosFieldEntry?.source })
        };
        return [result];
    }
}
