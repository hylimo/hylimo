import type { ToolboxEdit } from "@hylimo/diagram-protocol";
import type { EditHandler } from "./editHandler.js";
import { SharedSettings } from "@hylimo/diagram-protocol";

/**
 * Handler for toolbox edits
 */
export const toolboxHandler: EditHandler<ToolboxEdit> = {
    type: /toolbox\/.*/,

    predictActionDiff() {
        return [];
    },

    transformEdit(edit, config) {
        edit.values.x = SharedSettings.roundToTranslationPrecision(config.settings, edit.values.x);
        edit.values.y = SharedSettings.roundToTranslationPrecision(config.settings, edit.values.y);
    }
};
