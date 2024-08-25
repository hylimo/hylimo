import { CanvasElement, DefaultEditTypes } from "@hylimo/diagram-common";
import { IncrementalUpdate, ResizeEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { roundToPrecision } from "../../util/roundToPrecision.js";

/**
 * Handler for resize height edits
 */
export const resizeHeight: EditHandler<ResizeEdit> = {
    type: DefaultEditTypes.RESIZE_HEIGHT,

    predictActionDiff(lastApplied, newest, elements) {
        const updates: IncrementalUpdate[] = [];
        for (const element of elements) {
            if (CanvasElement.isCanvasElement(element)) {
                updates.push({
                    target: element.id,
                    changes: {
                        height: newest.height,
                        // scale the relative y position according to the new height
                        y: (newest.height! / element.height) * element.y
                    }
                });
            }
        }
        return updates;
    },

    transformEdit(edit, config) {
        const { height, dh } = edit.values;
        edit.values.dh = roundToPrecision(dh!, config.settings.resizePrecision);
        edit.values.height = roundToPrecision(height! - (dh! - edit.values.dh), undefined);
    }
};
