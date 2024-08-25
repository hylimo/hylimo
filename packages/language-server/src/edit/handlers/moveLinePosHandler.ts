import { IncrementalUpdate, MoveLposEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { DefaultEditTypes, LinePoint } from "@hylimo/diagram-common";
import { roundToPrecision } from "../../util/roundToPrecision.js";

/**
 * Handler for lpos pos edits
 */
export const moveLinePosHandler: EditHandler<MoveLposEdit> = {
    type: DefaultEditTypes.MOVE_LPOS_POS,

    predictActionDiff(lastApplied, newest, elements) {
        let changes: { pos: number; segment?: number };
        const newestPos = newest.pos;
        if (Array.isArray(newestPos)) {
            changes = {
                pos: newestPos[1],
                segment: newestPos[0]
            };
        } else {
            changes = {
                pos: newestPos
            };
        }
        const updates: IncrementalUpdate[] = [];
        for (const element of elements) {
            if (LinePoint.isLinePoint(element)) {
                updates.push({
                    target: element.id,
                    changes
                });
            }
        }
        return updates;
    },

    transformEdit(edit, config) {
        const pos = edit.values.pos;
        if (Array.isArray(pos)) {
            pos[1] = roundToPrecision(pos[1], config.settings.linePointPosPrecision);
        } else {
            edit.values.pos = roundToPrecision(pos, config.settings.linePointPosPrecision);
        }
    }
};
