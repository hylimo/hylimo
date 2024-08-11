import { Size, Point, Element, CanvasBezierSegment } from "@hylimo/diagram-common";
import { canvasPointType } from "../../../module/types.js";
import { LayoutElement } from "../../layoutElement.js";
import { Layout } from "../../layoutEngine.js";
import { CanvasConnectionSegmentLayoutConfig } from "./canvasConnectionSegmentLayoutConfig.js";

/**
 * Layout config for canvas line segments
 */
export class CanvasBezierSegmentLayoutConfig extends CanvasConnectionSegmentLayoutConfig {
    override type = CanvasBezierSegment.TYPE;

    constructor() {
        super(
            [
                {
                    name: "startControlPoint",
                    description: "The control point near the start of the segment",
                    type: canvasPointType
                },
                {
                    name: "endControlPoint",
                    description: "The control point near the end of the segment",
                    type: canvasPointType
                }
            ],
            []
        );
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const result: CanvasBezierSegment = {
            id,
            type: CanvasBezierSegment.TYPE,
            children: [],
            end: this.getContentId(element, "end"),
            startControlPoint: this.getContentId(element, "startControlPoint"),
            endControlPoint: this.getContentId(element, "endControlPoint")
        };
        return [result];
    }
}
