import type { ConnectionEdit, ConnectionEnd } from "@hylimo/diagram-protocol";
import type { EditHandler } from "./editHandler.js";
import type { Config } from "../../config.js";

/**
 * Handler for connection edits
 */
export const connectionHandler: EditHandler<ConnectionEdit> = {
    type: /connection\/.*/,

    predictActionDiff() {
        return [];
    },

    transformEdit(edit, config) {
        transformConnectionEnd(edit.values.start, config);
        transformConnectionEnd(edit.values.end, config);
    }
};

/**
 * Rounds the variable for a connection end
 *
 * @param connectionEnd the connection end to round
 * @param config the config to use for rounding
 */
function transformConnectionEnd(connectionEnd: ConnectionEnd, config: Config) {
    if ("expression" in connectionEnd) {
        connectionEnd.pos = config.roundToLinePointPosPrecision(connectionEnd.pos);
    } else {
        connectionEnd.x = config.roundToTranslationPrecision(connectionEnd.x);
        connectionEnd.y = config.roundToTranslationPrecision(connectionEnd.y);
    }
}
