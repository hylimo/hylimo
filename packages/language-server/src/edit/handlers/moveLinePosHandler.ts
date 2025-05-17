import type { IncrementalUpdate, MoveLposEdit } from "@hylimo/diagram-protocol";
import type { EditHandler } from "./editHandler.js";
import { DefaultEditTypes, LinePoint } from "@hylimo/diagram-common";
import { SharedSettings } from "@hylimo/diagram-protocol";

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
        if (typeof pos === "number") {
            // Handle the case where pos is a single number
            edit.values.pos = SharedSettings.roundToLinePointPosPrecision(config.settings, pos);
        } else {
            // Handle the case where pos is an array of numbers
            pos[0] = SharedSettings.roundToLinePointPosPrecision(config.settings, pos[0]);
            pos[1] = SharedSettings.roundToLinePointPosPrecision(config.settings, pos[1]);
            edit.values.pos = pos as [number, number];
        }
    }
};
