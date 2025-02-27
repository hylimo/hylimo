import { SplitCanvasAxisAlignedSegmentEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { DefaultEditTypes } from "@hylimo/diagram-common";

/**
 * Handler for splitCanvasAxisAlignedSegment edits
 */
export const splitCanvasAxisAlignedSegmentHandler: EditHandler<SplitCanvasAxisAlignedSegmentEdit> = {
    type: DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT,

    predictActionDiff() {
        return undefined;
    },

    transformEdit(edit, config) {
        edit.values.x = config.roundToTranslationPrecision(edit.values.x);
        edit.values.y = config.roundToTranslationPrecision(edit.values.y);
        edit.values.pos = config.roundToAxisAlignedPosPrecision(edit.values.pos);
        edit.values.nextPos = config.roundToAxisAlignedPosPrecision(edit.values.nextPos);
    }
};
