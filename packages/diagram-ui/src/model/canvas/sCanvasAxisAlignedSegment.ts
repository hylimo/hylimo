import {
    CanvasAxisAlignedSegment,
    DefaultEditTypes,
    EditSpecification,
    SegmentLayoutInformation
} from "@hylimo/diagram-common";
import { VNode } from "snabbdom";
import { svg } from "sprotty";
import { SCanvasConnectionSegment } from "./sCanvasConnectionSegment.js";
import { LinearAnimatable } from "../../features/animation/model.js";

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
    /**
     * Class applied to the vertical edit helper line
     */
    static readonly SEGMENT_EDIT_CLASS_Y = "axis-aligned-segment-edit-y";
    /**
     * Class applied to the horizontal edit helper line
     */
    static readonly SEGMENT_EDIT_CLASS_X = "axis-aligned-segment-edit-x";
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

    override generateControlViewElements(layout: SegmentLayoutInformation): VNode[] {
        if (DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS in this.edits) {
            if (this.pos >= 0) {
                const x = layout.start.x + this.pos * (layout.end.x - layout.start.x);
                return [
                    this.generateVerticalControlLine(x, layout.start.y, layout.end.y, layout.start.x, layout.end.x),
                    this.generateHorizontalControlLine(layout.start.y, layout.start.x, x, layout.start.y, layout.end.y),
                    this.generateHorizontalControlLine(layout.end.y, x, layout.end.x, layout.start.y, layout.end.y)
                ];
            } else {
                const y = layout.end.y + this.pos * (layout.end.y - layout.start.y);
                return [
                    this.generateHorizontalControlLine(y, layout.start.x, layout.end.x, layout.start.y, layout.end.y),
                    this.generateVerticalControlLine(layout.start.x, layout.start.y, y, layout.start.x, layout.end.x),
                    this.generateVerticalControlLine(layout.end.x, y, layout.end.y, layout.start.x, layout.end.x)
                ];
            }
        } else {
            return [];
        }
    }

    /**
     * Generates a vertical control line
     *
     * @param x the x position of the line
     * @param y1 the y start position of the line
     * @param y2 the y end position of the line
     * @param startX the x start position of the segment
     * @param endX the x end position of the segment
     * @returns the generated line
     */
    private generateVerticalControlLine(x: number, y1: number, y2: number, startX: number, endX: number): VNode {
        return svg("line.resize", {
            attrs: {
                x1: x,
                y1,
                x2: x,
                y2,
                "data-start": startX,
                "data-end": endX,
                "data-current": x,
                "data-id": this.id
            },
            class: {
                [SCanvasAxisAlignedSegment.SEGMENT_EDIT_CLASS_Y]: true
            }
        });
    }

    /**
     * Generates a horizontal control line
     * @param y the y position of the line
     * @param x1 the x start position of the line
     * @param x2 the x end position of the line
     * @param startY the y start position of the segment
     * @param endY the y end position of the segment
     * @returns the generated line
     */
    private generateHorizontalControlLine(y: number, x1: number, x2: number, startY: number, endY: number): VNode {
        return svg("line.resize", {
            attrs: {
                x1,
                y1: y,
                x2,
                y2: y,
                "data-start": startY,
                "data-end": endY,
                "data-current": y,
                "data-id": this.id
            },
            class: {
                [SCanvasAxisAlignedSegment.SEGMENT_EDIT_CLASS_X]: true
            }
        });
    }

    override canSplitSegment(): boolean {
        return EditSpecification.isConsistent([[this.edits[DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT]]]);
    }
}
