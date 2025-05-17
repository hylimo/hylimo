import type { SplitCanvasBezierSegmentEdit } from "@hylimo/diagram-protocol";
import type { EditHandler } from "./editHandler.js";
import { DefaultEditTypes } from "@hylimo/diagram-common";
import { SharedSettings } from "@hylimo/diagram-protocol";

/**
 * Handler for splitCanvasBezierSegment edits
 */
export const splitCanvasBezierSegmentHandler: EditHandler<SplitCanvasBezierSegmentEdit> = {
    type: DefaultEditTypes.SPLIT_CANVAS_BEZIER_SEGMENT,

    predictActionDiff() {
        return undefined;
    },

    transformEdit(edit, config) {
        edit.values.x = SharedSettings.roundToTranslationPrecision(config.settings, edit.values.x);
        edit.values.y = SharedSettings.roundToTranslationPrecision(config.settings, edit.values.y);
        edit.values.cx1 = SharedSettings.roundToTranslationPrecision(config.settings, edit.values.cx1);
        edit.values.cy1 = SharedSettings.roundToTranslationPrecision(config.settings, edit.values.cy1);
        edit.values.cx2 = SharedSettings.roundToTranslationPrecision(config.settings, edit.values.cx2);
        edit.values.cy2 = SharedSettings.roundToTranslationPrecision(config.settings, edit.values.cy2);
    }
};
