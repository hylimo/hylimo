import { CanvasLineSegment, SegmentLayoutInformation } from "@hylimo/diagram-common";
import { SCanvasConnectionSegment } from "./sCanvasConnectionSegment";
import { VNode } from "snabbdom";

/**
 * Model for CanvasLineSegment
 */
export class SCanvasLineSegment extends SCanvasConnectionSegment implements CanvasLineSegment {
    override type!: typeof CanvasLineSegment.TYPE;
    override get dependencies(): string[] {
        return [this.end];
    }

    override generateControlViewElements(_layout: SegmentLayoutInformation): VNode[] {
        return [];
    }
}
