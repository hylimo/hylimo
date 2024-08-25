import { Size, Point, Element, CanvasLineSegment } from "@hylimo/diagram-common";
import { LayoutElement } from "../../layoutElement.js";
import { Layout } from "../../layoutEngine.js";
import { CanvasConnectionSegmentLayoutConfig } from "./canvasConnectionSegmentLayoutConfig.js";

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
            end: this.getContentId(element, "end"),
            edits: element.edits
        };
        return [result];
    }
}
