import { IncrementalUpdate, MoveEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { AbsolutePoint, DefaultEditTypes, RelativePoint } from "@hylimo/diagram-common";
import { roundToPrecision } from "../../util/roundToPrecision.js";

/**
 * Handler for moveY edits
 */
export const moveYHandler: EditHandler<MoveEdit> = {
    type: DefaultEditTypes.MOVE_Y,

    predictActionDiff(layoutedDiagram, lastApplied, newest, elements) {
        const deltaY = newest.dy - (lastApplied?.dy ?? 0);
        const updates: IncrementalUpdate[] = [];
        for (const element of elements) {
            if (AbsolutePoint.isAbsolutePoint(element)) {
                element.y += deltaY;
                updates.push({
                    target: element.id,
                    changes: {
                        y: element.y
                    }
                });
            } else if (RelativePoint.isRelativePoint(element)) {
                element.offsetY += deltaY;
                updates.push({
                    target: element.id,
                    changes: {
                        offsetY: element.offsetY
                    }
                });
            } else {
                return [];
            }
        }
        return updates;
    },

    transformEdit(edit, config) {
        edit.values.dy = roundToPrecision(edit.values.dy, config.settings.translationPrecision);
    }
};
