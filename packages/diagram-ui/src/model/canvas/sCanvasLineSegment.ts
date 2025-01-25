import {
    CanvasLineSegment,
    DefaultEditTypes,
    EditSpecification,
    SegmentLayoutInformation
} from "@hylimo/diagram-common";
import { SCanvasConnectionSegment } from "./sCanvasConnectionSegment.js";
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

    override canSplitSegment(): boolean {
        return EditSpecification.isConsistent([[this.edits[DefaultEditTypes.SPLIT_CANVAS_LINE_SEGMENT]]]);
    }
}
