import type { SplitCanvasAxisAlignedSegmentEdit } from "@hylimo/diagram-protocol";
import type { EditHandler } from "./editHandler.js";
import { DefaultEditTypes } from "@hylimo/diagram-common";
import { SharedSettings } from "@hylimo/diagram-protocol";

/**
 * Handler for splitCanvasAxisAlignedSegment edits
 */
export const splitCanvasAxisAlignedSegmentHandler: EditHandler<SplitCanvasAxisAlignedSegmentEdit> = {
    type: DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT,

    predictActionDiff() {
        return undefined;
    },

    transformEdit(edit, config) {
        edit.values.x = SharedSettings.roundToTranslationPrecision(config.settings, edit.values.x);
        edit.values.y = SharedSettings.roundToTranslationPrecision(config.settings, edit.values.y);
        edit.values.pos = SharedSettings.roundToAxisAlignedPosPrecision(config.settings, edit.values.pos);
        edit.values.nextPos = SharedSettings.roundToAxisAlignedPosPrecision(config.settings, edit.values.nextPos);
    }
};
