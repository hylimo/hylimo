import { CanvasElement, DefaultEditTypes } from "@hylimo/diagram-common";
import { IncrementalUpdate, ResizeEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";
import { roundToPrecision } from "../../util/roundToPrecision.js";

/**
 * Handler for resize width edits
 */
export const resizeWidth: EditHandler<ResizeEdit> = {
    type: DefaultEditTypes.RESIZE_WIDTH,

    predictActionDiff(lastApplied, newest, elements) {
        const updates: IncrementalUpdate[] = [];
        for (const element of elements) {
            if (CanvasElement.isCanvasElement(element)) {
                updates.push({
                    target: element.id,
                    changes: {
                        width: newest.width,
                        // scale the relative x position according to the new width
                        x: (newest.width! / element.width) * element.x
                    }
                });
            }
        }
        return updates;
    },

    transformEdit(edit, config) {
        const { width, dw } = edit.values;
        edit.values.dw = roundToPrecision(dw!, config.settings.resizePrecision);
        edit.values.width = roundToPrecision(width! - (dw! - edit.values.dw), undefined);
    }
};