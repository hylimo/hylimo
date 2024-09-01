import { CanvasElement, DefaultEditTypes } from "@hylimo/diagram-common";
import { IncrementalUpdate, ResizeEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";

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
        edit.values.dw = config.roundToResizePrecision(dw!);
        edit.values.width = width! - (dw! - edit.values.dw);
    }
};
