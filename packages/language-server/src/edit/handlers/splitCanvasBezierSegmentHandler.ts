import { SplitCanvasBezierSegmentEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { DefaultEditTypes } from "@hylimo/diagram-common";
import { roundToPrecision } from "../../util/roundToPrecision.js";

/**
 * Handler for splitCanvasBezierSegment edits
 */
export const splitCanvasBezierSegmentHandler: EditHandler<SplitCanvasBezierSegmentEdit> = {
    type: DefaultEditTypes.SPLIT_CANVAS_BEZIER_SEGMENT,

    predictActionDiff() {
        return [];
    },

    transformEdit(edit, config) {
        edit.values.x = roundToPrecision(edit.values.x, config.settings.translationPrecision);
        edit.values.y = roundToPrecision(edit.values.y, config.settings.translationPrecision);
        edit.values.cx1 = roundToPrecision(edit.values.cx1, config.settings.translationPrecision);
        edit.values.cy1 = roundToPrecision(edit.values.cy1, config.settings.translationPrecision);
        edit.values.cx2 = roundToPrecision(edit.values.cx2, config.settings.translationPrecision);
        edit.values.cy2 = roundToPrecision(edit.values.cy2, config.settings.translationPrecision);
    }
};
