import { IncrementalUpdate, MoveEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { AbsolutePoint, DefaultEditTypes, RelativePoint } from "@hylimo/diagram-common";
import { roundToPrecision } from "../../util/roundToPrecision.js";

/**
 * Handler for moveX edits
 */
export const moveXHandler: EditHandler<MoveEdit> = {
    type: DefaultEditTypes.MOVE_X,

    predictActionDiff(layoutedDiagram, lastApplied, newest, elements) {
        const deltaX = newest.dx - (lastApplied?.dx ?? 0);
        const updates: IncrementalUpdate[] = [];
        for (const element of elements) {
            if (AbsolutePoint.isAbsolutePoint(element)) {
                element.x += deltaX;
                updates.push({
                    target: element.id,
                    changes: {
                        x: element.x
                    }
                });
            } else if (RelativePoint.isRelativePoint(element)) {
                element.offsetX += deltaX;
                updates.push({
                    target: element.id,
                    changes: {
                        offsetX: element.offsetX
                    }
                });
            }
        }
        return updates;
    },

    transformEdit(edit, config) {
        edit.values.dx = roundToPrecision(edit.values.dx, config.settings.translationPrecision);
    }
};
