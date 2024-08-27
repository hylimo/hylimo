import { SplitCanvasLineSegmentEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { DefaultEditTypes } from "@hylimo/diagram-common";
import { roundToPrecision } from "../../util/roundToPrecision.js";

/**
 * Handler for splitCanvasSegment edits
 */
export const splitCanvasSegmentHandler: EditHandler<SplitCanvasLineSegmentEdit> = {
    type: DefaultEditTypes.SPLIT_CANVAS_LINE_SEGMENT,

    predictActionDiff() {
        return [];
    },

    transformEdit(edit, config) {
        edit.values.x = roundToPrecision(edit.values.x, config.settings.translationPrecision);
        edit.values.y = roundToPrecision(edit.values.y, config.settings.translationPrecision);
    }
};
