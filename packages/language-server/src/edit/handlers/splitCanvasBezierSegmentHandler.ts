import type { SplitCanvasBezierSegmentEdit } from "@hylimo/diagram-protocol";
import type { EditHandler } from "./editHandler.js";
import { DefaultEditTypes } from "@hylimo/diagram-common";

/**
 * Handler for splitCanvasBezierSegment edits
 */
export const splitCanvasBezierSegmentHandler: EditHandler<SplitCanvasBezierSegmentEdit> = {
    type: DefaultEditTypes.SPLIT_CANVAS_BEZIER_SEGMENT,

    predictActionDiff() {
        return undefined;
    },

    transformEdit(edit, config) {
        edit.values.x = config.roundToTranslationPrecision(edit.values.x);
        edit.values.y = config.roundToTranslationPrecision(edit.values.y);
        edit.values.cx1 = config.roundToTranslationPrecision(edit.values.cx1);
        edit.values.cy1 = config.roundToTranslationPrecision(edit.values.cy1);
        edit.values.cx2 = config.roundToTranslationPrecision(edit.values.cx2);
        edit.values.cy2 = config.roundToTranslationPrecision(edit.values.cy2);
    }
};
