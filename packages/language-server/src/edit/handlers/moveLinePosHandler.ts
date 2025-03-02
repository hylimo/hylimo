import type { IncrementalUpdate, MoveLposEdit } from "@hylimo/diagram-protocol";
import type { EditHandler } from "./editHandler.js";
import { DefaultEditTypes, LinePoint } from "@hylimo/diagram-common";

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
            pos[1] = config.roundToLinePointPosPrecision(pos[1]);
        } else {
            edit.values.pos = config.roundToLinePointPosPrecision(pos);
        }
    }
};
