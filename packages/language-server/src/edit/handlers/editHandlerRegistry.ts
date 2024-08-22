import { axisAlignedSegmentPosHandler } from "./axisAlignedSegmentPosHandler.js";
import { EditHandler } from "./editHandler.js";
import { moveLineDistHandler } from "./moveLineDistHandler.js";
import { moveLinePosHandler } from "./moveLinePosHandler.js";
import { moveXHandler } from "./moveXHandler.js";
import { moveYHandler } from "./moveYHandler.js";
import { rotationhandler } from "./rotationHandler.js";

/**
 * Registry for all edit handlers
 */
export class EditHandlerRegistry {
    /**
     * Map of all edit handlers
     */
    private readonly handlers: Map<string, EditHandler<any>> = new Map();

    /**
     * Creates a new TransactionalEditRegistory
     *
     * @param handler the edit handlers to register
     */
    constructor(handler: EditHandler<any>[]) {
        handler.forEach((edit) => this.handlers.set(edit.type, edit));
    }

    /**
     * Returns the edit handler for the given type.
     * If no handler is found for the type, an error is thrown.
     *
     * @param type the type of the edit to get the handler for
     * @returns the edit handler
     */
    getEditHandler(type: string): EditHandler<any> | undefined {
        return this.handlers.get(type);
    }
}

/**
 * Default registry for all edits
 */
export const defaultEditRegistry = new EditHandlerRegistry([
    moveXHandler,
    moveYHandler,
    moveLinePosHandler,
    moveLineDistHandler,
    axisAlignedSegmentPosHandler,
    rotationhandler
]);
