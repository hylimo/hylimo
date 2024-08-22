import { IncrementalUpdate, MoveLposEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { DefaultEditTypes, LinePoint } from "@hylimo/diagram-common";
import { roundToPrecision } from "../../util/roundToPrecision.js";

/**
 * Handler for lpos dist edits
 */
export const moveLineDistHandler: EditHandler<MoveLposEdit> = {
    type: DefaultEditTypes.MOVE_LPOS_DIST,

    predictActionDiff(layoutedDiagram, lastApplied, newest, elements) {
        const updates: IncrementalUpdate[] = [];
        for (const element of elements) {
            if (LinePoint.isLinePoint(element)) {
                element.distance = newest.dist;
                updates.push({
                    target: element.id,
                    changes: {
                        distance: element.distance
                    }
                });
            }
        }
        return updates;
    },

    transformEdit(edit, config) {
        edit.values.dist = roundToPrecision(edit.values.dist, config.settings.linePointDistancePrecision);
    }
};
