import { IncrementalUpdate, MoveEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { AbsolutePoint, DefaultEditTypes } from "@hylimo/diagram-common";
import { computeElementsToUpdate } from "./translationHandlerUtils.js";

/**
 * Handler for moveX edits
 */
export const moveXHandler: EditHandler<MoveEdit> = {
    type: DefaultEditTypes.MOVE_X,

    predictActionDiff(lastApplied, newest, elements, elementLookup) {
        const deltaX = newest.dx - (lastApplied?.dx ?? 0);
        const updates: IncrementalUpdate[] = [];

        for (const element of computeElementsToUpdate(elements, elementLookup)) {
            if (AbsolutePoint.isAbsolutePoint(element)) {
                updates.push({
                    target: element.id,
                    changes: {
                        x: element.x + deltaX
                    }
                });
            } else {
                updates.push({
                    target: element.id,
                    changes: {
                        offsetX: element.offsetX + deltaX
                    }
                });
            }
        }
        return updates;
    },

    transformEdit(edit, config) {
        edit.values.dx = config.roundToTranslationPrecision(edit.values.dx);
    }
};
