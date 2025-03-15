import type { CanvasLineSegment } from "@hylimo/diagram-common";
import { DefaultEditTypes, EditSpecification } from "@hylimo/diagram-common";
import { SCanvasConnectionSegment } from "./sCanvasConnectionSegment.js";
import type { VNode } from "snabbdom";

/**
 * Model for CanvasLineSegment
 */
export class SCanvasLineSegment extends SCanvasConnectionSegment implements CanvasLineSegment {
    override type!: typeof CanvasLineSegment.TYPE;
    override get dependencies(): string[] {
        return [this.end];
    }

    override generateControlViewElements(): VNode[] {
        return [];
    }

    override canSplitSegment(): boolean {
        return EditSpecification.isConsistent([[this.edits[DefaultEditTypes.SPLIT_CANVAS_LINE_SEGMENT]]]);
    }
}
