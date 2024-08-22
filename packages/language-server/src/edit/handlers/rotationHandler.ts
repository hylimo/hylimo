import { CanvasElement, DefaultEditTypes } from "@hylimo/diagram-common";
import { IncrementalUpdate, RotateEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { roundToPrecision } from "../../util/roundToPrecision.js";

/**
 * Handler for axis aligned segment pos edits
 */
export const rotationhandler: EditHandler<RotateEdit> = {
    type: DefaultEditTypes.ROTATE,

    predictActionDiff(layoutedDiagram, lastApplied, newest, elements) {
        const updates: IncrementalUpdate[] = [];
        for (const element of elements) {
            if (CanvasElement.isCanvasElement(element)) {
                element.rotation = newest.rotation;
                updates.push({
                    target: element.id,
                    changes: {
                        rotation: element.rotation
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
