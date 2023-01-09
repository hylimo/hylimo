import { Size, Point, Element, CanvasBezierSegment } from "@hylimo/diagram-common";
import { canvasPointType } from "../../../module/diagramModule";
import { LayoutElement } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { CanvasConnectionSegmentLayoutConfig } from "./canvasConnectionSegmentLayoutConfig";

/**
 * Layout config for canvas line segments
 */
export class CanvasBezierSegmentLayoutConfig extends CanvasConnectionSegmentLayoutConfig {
    constructor() {
        super(
            "canvasLineSegment",
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
            type: "canvasBezierSegment",
            ...position,
            ...size,
            children: [],
            start: this.getPoint(element, "start"),
            end: this.getPoint(element, "end"),
            startControlPoint: this.getPoint(element, "startControlPoint"),
            endControlPoint: this.getPoint(element, "endControlPoint")
        };
        return [result];
    }
}
