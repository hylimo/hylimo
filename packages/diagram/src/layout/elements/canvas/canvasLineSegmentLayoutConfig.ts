import { Size, Point, Element, CanvasLineSegment } from "@hylimo/diagram-common";
import { LayoutElement } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { CanvasConnectionSegmentLayoutConfig } from "./canvasConnectionSegmentLayoutConfig";

/**
 * Layout config for canvas line segments
 */
export class CanvasLineSegmentLayoutConfig extends CanvasConnectionSegmentLayoutConfig {
    override type = CanvasLineSegment.TYPE;

    constructor() {
        super([], []);
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const result: CanvasLineSegment = {
            id,
            type: CanvasLineSegment.TYPE,
            children: [],
            end: this.getContentId(element, "end")
        };
        return [result];
    }
}
