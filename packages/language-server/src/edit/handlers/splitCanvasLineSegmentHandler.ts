import type { SplitCanvasLineSegmentEdit } from "@hylimo/diagram-protocol";
import type { EditHandler } from "./editHandler.js";
import { DefaultEditTypes } from "@hylimo/diagram-common";
import { SharedSettings } from "@hylimo/diagram-protocol";

/**
 * Handler for splitCanvasLineSegment edits
 */
export const splitCanvasLineSegmentHandler: EditHandler<SplitCanvasLineSegmentEdit> = {
    type: DefaultEditTypes.SPLIT_CANVAS_LINE_SEGMENT,

    predictActionDiff() {
        return undefined;
    },

    transformEdit(edit, config) {
        edit.values.x = SharedSettings.roundToTranslationPrecision(config.settings, edit.values.x);
        edit.values.y = SharedSettings.roundToTranslationPrecision(config.settings, edit.values.y);
    }
};
