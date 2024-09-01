import { SplitCanvasLineSegmentEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { DefaultEditTypes } from "@hylimo/diagram-common";

/**
 * Handler for splitCanvasLineSegment edits
 */
export const splitCanvasLineSegmentHandler: EditHandler<SplitCanvasLineSegmentEdit> = {
    type: DefaultEditTypes.SPLIT_CANVAS_LINE_SEGMENT,

    predictActionDiff() {
        return [];
    },

    transformEdit(edit, config) {
        edit.values.x = config.roundToTranslationPrecision(edit.values.x);
        edit.values.y = config.roundToTranslationPrecision(edit.values.y);
    }
};
