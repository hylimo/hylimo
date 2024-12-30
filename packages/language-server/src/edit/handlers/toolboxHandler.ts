import { ToolboxEdit } from "@hylimo/diagram-protocol";
import { EditHandler } from "./editHandler.js";

/**
 * Handler for toolbox edits
 */
export const toolboxHandler: EditHandler<ToolboxEdit> = {
    type: /toolbox\/.*/,

    predictActionDiff() {
        return [];
    },

    transformEdit(edit, config) {
        edit.values.x = config.roundToTranslationPrecision(edit.values.x);
        edit.values.y = config.roundToTranslationPrecision(edit.values.y);
    }
};
