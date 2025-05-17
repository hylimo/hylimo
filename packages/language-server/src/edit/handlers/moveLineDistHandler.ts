import type { IncrementalUpdate, MoveLposEdit } from "@hylimo/diagram-protocol";
import type { EditHandler } from "./editHandler.js";
import { DefaultEditTypes, LinePoint } from "@hylimo/diagram-common";
import { SharedSettings } from "@hylimo/diagram-protocol";

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
        if (edit.values.dist != undefined) {
            edit.values.dist = SharedSettings.roundToLinePointDistancePrecision(config.settings, edit.values.dist);
        }
    }
};
