import type { Size, Point, Element } from "@hylimo/diagram-common";
import { CanvasBezierSegment } from "@hylimo/diagram-common";
import { canvasPointType } from "../../../module/base/types.js";
import type { LayoutElement } from "../../layoutElement.js";
import type { Layout } from "../../engine/layout.js";
import { CanvasConnectionSegmentLayoutConfig } from "./canvasConnectionSegmentLayoutConfig.js";

/**
 * Layout config for canvas line segments
 */
export class CanvasBezierSegmentLayoutConfig extends CanvasConnectionSegmentLayoutConfig {
    override type = CanvasBezierSegment.TYPE;
    override idGroup = "cb";

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
            end: this.getContentId(layout, element, "end"),
            startControlPoint: this.getContentId(layout, element, "startControlPoint"),
            endControlPoint: this.getContentId(layout, element, "endControlPoint"),
            edits: element.edits
        };
        return [result];
    }
}
