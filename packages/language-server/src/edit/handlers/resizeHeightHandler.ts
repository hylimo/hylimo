import { CanvasElement, DefaultEditTypes } from "@hylimo/diagram-common";
import type { IncrementalUpdate, ResizeEdit } from "@hylimo/diagram-protocol";
import type { EditHandler } from "./editHandler.js";

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
                        dy: (newest.height! / element.height) * element.dy
                    }
                });
            }
        }
        return updates;
    },

    transformEdit(edit, config) {
        const { height, dh } = edit.values;
        edit.values.dh = config.roundToResizePrecision(dh!);
        edit.values.height = height! - (dh! - edit.values.dh);
    }
};
