import { IncrementalUpdate, MoveEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { AbsolutePoint, DefaultEditTypes } from "@hylimo/diagram-common";
import { computeElementsToUpdate } from "./translationHandlerUtils.js";

/**
 * Handler for moveY edits
 */
export const moveYHandler: EditHandler<MoveEdit> = {
    type: DefaultEditTypes.MOVE_Y,

    predictActionDiff(lastApplied, newest, elements, elementLookup) {
        const deltaY = newest.dy - (lastApplied?.dy ?? 0);
        const updates: IncrementalUpdate[] = [];
        const elementsToUpdate = computeElementsToUpdate(elements, elementLookup);
        if (elementsToUpdate == undefined) {
            return undefined;
        }
        for (const element of elementsToUpdate) {
            if (AbsolutePoint.isAbsolutePoint(element)) {
                updates.push({
                    target: element.id,
                    changes: {
                        y: element.y + deltaY
                    }
                });
            } else {
                updates.push({
                    target: element.id,
                    changes: {
                        offsetY: element.offsetY + deltaY
                    }
                });
            }
        }
        return updates;
    },

    transformEdit(edit, config) {
        edit.values.dy = config.roundToTranslationPrecision(edit.values.dy);
    }
};
