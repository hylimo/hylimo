import { CanvasAxisAlignedSegment, DefaultEditTypes } from "@hylimo/diagram-common";
import type { AxisAlignedSegmentEdit, IncrementalUpdate } from "@hylimo/diagram-protocol";
import type { EditHandler } from "./editHandler.js";

/**
 * Handler for axis aligned segment pos edits
 */
export const axisAlignedSegmentPosHandler: EditHandler<AxisAlignedSegmentEdit> = {
    type: DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS,

    predictActionDiff(lastApplied, newest, elements) {
        const updates: IncrementalUpdate[] = [];
        for (const element of elements) {
            if (CanvasAxisAlignedSegment.isCanvasAxisAlignedSegment(element)) {
                updates.push({
                    target: element.id,
                    changes: {
                        pos: newest.pos
                    }
                });
            }
        }
        return updates;
    },

    transformEdit(edit, config) {
        edit.values.pos = config.roundToAxisAlignedPosPrecision(edit.values.pos);
    }
};
