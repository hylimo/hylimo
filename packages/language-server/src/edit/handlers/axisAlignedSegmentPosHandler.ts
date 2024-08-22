import { CanvasAxisAlignedSegment, DefaultEditTypes } from "@hylimo/diagram-common";
import { AxisAlignedSegmentEdit, IncrementalUpdate } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { roundToPrecision } from "../../util/roundToPrecision.js";

/**
 * Handler for axis aligned segment pos edits
 */
export const axisAlignedSegmentPosHandler: EditHandler<AxisAlignedSegmentEdit> = {
    type: DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS,

    predictActionDiff(layoutedDiagram, lastApplied, newest, elements) {
        const updates: IncrementalUpdate[] = [];
        for (const element of elements) {
            if (CanvasAxisAlignedSegment.isCanvasAxisAlignedSegment(element)) {
                element.pos = newest.pos;
                updates.push({
                    target: element.id,
                    changes: {
                        pos: element.pos
                    }
                });
            }
        }
        return updates;
    },

    transformEdit(edit, config) {
        edit.values.pos = roundToPrecision(edit.values.pos, config.settings.axisAlignedPosPrecision);
    }
};
