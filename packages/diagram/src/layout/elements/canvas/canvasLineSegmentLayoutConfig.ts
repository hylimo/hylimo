import type { Size, Point, Element } from "@hylimo/diagram-common";
import { CanvasLineSegment } from "@hylimo/diagram-common";
import type { LayoutElement } from "../../layoutElement.js";
import type { Layout } from "../../engine/layout.js";
import { CanvasConnectionSegmentLayoutConfig } from "./canvasConnectionSegmentLayoutConfig.js";

/**
 * Layout config for canvas line segments
 */
export class CanvasLineSegmentLayoutConfig extends CanvasConnectionSegmentLayoutConfig {
    override type = CanvasLineSegment.TYPE;
    override idGroup = "cl";

    constructor() {
        super([], []);
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const result: CanvasLineSegment = {
            id,
            type: CanvasLineSegment.TYPE,
            children: [],
            end: this.getContentId(layout, element, "end"),
            edits: element.edits
        };
        return [result];
    }
}
