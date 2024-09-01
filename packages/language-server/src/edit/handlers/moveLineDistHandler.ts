import { IncrementalUpdate, MoveLposEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { DefaultEditTypes, LinePoint } from "@hylimo/diagram-common";

/**
 * Handler for lpos dist edits
 */
export const moveLineDistHandler: EditHandler<MoveLposEdit> = {
    type: DefaultEditTypes.MOVE_LPOS_DIST,

    predictActionDiff(lastApplied, newest, elements) {
        const updates: IncrementalUpdate[] = [];
        for (const element of elements) {
            if (LinePoint.isLinePoint(element)) {
                updates.push({
                    target: element.id,
                    changes: {
                        distance: newest.dist
                    }
                });
            }
        }
        return updates;
    },

    transformEdit(edit, config) {
        edit.values.dist = config.roundToLinePointDistancePrecision(edit.values.dist);
    }
};
