import { CanvasElement, DefaultEditTypes } from "@hylimo/diagram-common";
import { IncrementalUpdate, RotateEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { roundToPrecision } from "../../util/roundToPrecision.js";

/**
 * Handler for axis aligned segment pos edits
 */
export const rotationHandler: EditHandler<RotateEdit> = {
    type: DefaultEditTypes.ROTATE,

    predictActionDiff(lastApplied, newest, elements) {
        const updates: IncrementalUpdate[] = [];
        for (const element of elements) {
            if (CanvasElement.isCanvasElement(element)) {
                updates.push({
                    target: element.id,
                    changes: {
                        rotation: newest.rotation
                    }
                });
            }
        }
        return updates;
    },

    transformEdit(edit, config) {
        edit.values.rotation = roundToPrecision(edit.values.rotation, config.settings.rotationPrecision);
    }
};
