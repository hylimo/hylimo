import type { CanvasAxisAlignedSegment, SegmentLayoutInformation } from "@hylimo/diagram-common";
import { DefaultEditTypes, EditSpecification } from "@hylimo/diagram-common";
import type { VNode } from "snabbdom";
import { svg } from "sprotty";
import { SCanvasConnectionSegment } from "./sCanvasConnectionSegment.js";
import type { LinearAnimatable } from "../../features/animation/model.js";
import type { SCanvasConnection } from "./sCanvasConnection.js";
import { computeResizeIconOffset } from "../../features/cursor/resizeIcon.js";

/**
 * Animated fields for CanvasAxisAlignedSegment
 */
const canvasAxisAlignedSegmentAnimatedFields = new Set(["pos"]);

/**
 * CanvasAxisAlignedSegment model element
 */
export class SCanvasAxisAlignedSegment
    extends SCanvasConnectionSegment
    implements CanvasAxisAlignedSegment, LinearAnimatable
{
    override type!: typeof CanvasAxisAlignedSegment.TYPE;
    readonly animatedFields = canvasAxisAlignedSegmentAnimatedFields;
    /**
     * Values betweeen 0 and 1:
     * The position on the x-axis where the vertical segment starts.
     * 0 being the start of the horizontal segment and 1 being the end.
     * Values between -1 and 0:
     * The position on the y-axis where the horizontal segment starts.
     * 0 being the end of the vertical segment and -1 being the start
     */
    pos!: number;

    override get dependencies(): string[] {
        return [this.end];
    }

    override generateControlViewElements(
        model: Readonly<SCanvasConnection>,
        layout: SegmentLayoutInformation,
        index: number
    ): VNode[] {
        if (DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS in this.edits) {
            const start = layout.start;
            const end = layout.end;
            if (this.pos >= 0) {
                const x = start.x + this.pos * (end.x - start.x);
                return [
                    this.generateHorizontalControlLine(model, start.y, start.x, x, index, 0),
                    this.generateVerticalControlLine(model, x, start.y, end.y, index, 1),
                    this.generateHorizontalControlLine(model, end.y, x, end.x, index, 2)
                ];
            } else {
                const y = end.y + this.pos * (end.y - start.y);
                return [
                    this.generateVerticalControlLine(model, start.x, start.y, y, index, 0),
                    this.generateHorizontalControlLine(model, y, start.x, end.x, index, 1),
                    this.generateVerticalControlLine(model, end.x, y, end.y, index, 2)
                ];
            }
        } else {
            return [];
        }
    }

    /**
     * Generates a vertical control line
     *
     * @param model the parent canvas connection
     * @param x the x position of the line
     * @param y1 the y start position of the line
     * @param y2 the y end position of the line
     * @param index the index of the segment
     * @param segmentIndex the index of the part of the segment
     * @returns the generated line
     */
    private generateVerticalControlLine(
        model: Readonly<SCanvasConnection>,
        x: number,
        y1: number,
        y2: number,
        index: number,
        segmentIndex: number
    ): VNode {
        return svg("line.resize", {
            attrs: {
                x1: x,
                y1,
                x2: x,
                y2,
                "data-index": index.toString(),
                "data-segment-index": segmentIndex.toString()
            },
            class: {
                [`cursor-resize-${computeResizeIconOffset(model.parent, 3 * 45)}`]: true
            }
        });
    }

    /**
     * Generates a horizontal control line
     *
     * @param model the parent canvas connection
     * @param y the y position of the line
     * @param x1 the x start position of the line
     * @param x2 the x end position of the line
     * @param index the index of the segment
     * @param segmentIndex the index of the part of the segment
     * @returns the generated line
     */
    private generateHorizontalControlLine(
        model: Readonly<SCanvasConnection>,
        y: number,
        x1: number,
        x2: number,
        index: number,
        segmentIndex: number
    ): VNode {
        return svg("line.resize", {
            attrs: {
                x1,
                y1: y,
                x2,
                y2: y,
                "data-index": index.toString(),
                "data-segment-index": segmentIndex.toString()
            },
            class: {
                [`cursor-resize-${computeResizeIconOffset(model.parent, 45)}`]: true
            }
        });
    }

    override canSplitSegment(): boolean {
        return EditSpecification.isConsistent([[this.edits[DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT]]]);
    }
}
