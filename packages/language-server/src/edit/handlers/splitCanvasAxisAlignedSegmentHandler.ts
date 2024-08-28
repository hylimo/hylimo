import { SplitCanvasAxisAlignedSegmentEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { DefaultEditTypes } from "@hylimo/diagram-common";
import { roundToPrecision } from "../../util/roundToPrecision.js";

/**
 * Handler for splitCanvasAxisAlignedSegment edits
 */
export const splitCanvasAxisAlignedSegmentHandler: EditHandler<SplitCanvasAxisAlignedSegmentEdit> = {
    type: DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT,

    predictActionDiff() {
        return [];
    },

    transformEdit(edit, config) {
        edit.values.x = roundToPrecision(edit.values.x, config.settings.translationPrecision);
        edit.values.y = roundToPrecision(edit.values.y, config.settings.translationPrecision);
        edit.values.pos = roundToPrecision(edit.values.pos, config.settings.axisAlignedPosPrecision);
        edit.values.nextPos = roundToPrecision(edit.values.nextPos, config.settings.axisAlignedPosPrecision);
    }
};
