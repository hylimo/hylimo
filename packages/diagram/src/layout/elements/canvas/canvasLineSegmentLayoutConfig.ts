import { Size, Point, Element, CanvasLineSegment } from "@hylimo/diagram-common";
import { LayoutElement } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { CanvasConnectionSegmentLayoutConfig } from "./canvasConnectionSegmentLayoutConfig";

/**
 * Layout config for canvas line segments
 */
export class CanvasLineSegmentLayoutConfig extends CanvasConnectionSegmentLayoutConfig {
    constructor() {
        super("canvasLineSegment", [], []);
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const result: CanvasLineSegment = {
            id,
            type: "canvasLineSegment",
            ...position,
            ...size,
            children: [],
            start: this.getPoint(element, "start"),
            end: this.getPoint(element, "end")
        };
        return [result];
    }
}
