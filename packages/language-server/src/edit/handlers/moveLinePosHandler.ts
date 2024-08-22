import { IncrementalUpdate, MoveLposEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { DefaultEditTypes, LinePoint } from "@hylimo/diagram-common";
import { roundToPrecision } from "../../util/roundToPrecision.js";

/**
 * Handler for lpos pos edits
 */
export const moveLinePosHandler: EditHandler<MoveLposEdit> = {
    type: DefaultEditTypes.MOVE_LPOS_POS,

    predictActionDiff(layoutedDiagram, lastApplied, newest, elements) {
        let pos: number;
        let segment: number | undefined;
        const newestPos = newest.pos;
        if (Array.isArray(newestPos)) {
            segment = newestPos[0];
            pos = newestPos[1];
        } else {
            pos = newestPos;
            segment = undefined;
        }
        const updates: IncrementalUpdate[] = [];
        for (const element of elements) {
            if (LinePoint.isLinePoint(element)) {
                element.pos = pos;
                element.segment = segment;
                updates.push({
                    target: element.id,
                    changes: {
                        pos: element.pos,
                        segment: element.segment
                    }
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
