import { axisAlignedSegmentPosHandler } from "./axisAlignedSegmentPosHandler.js";
import { EditHandler } from "./editHandler.js";
import { moveLineDistHandler } from "./moveLineDistHandler.js";
import { moveLinePosHandler } from "./moveLinePosHandler.js";
import { moveXHandler } from "./moveXHandler.js";
import { moveYHandler } from "./moveYHandler.js";
import { resizeHeight } from "./resizeHeightHandler.js";
import { resizeWidth } from "./resizeWidthHandler.js";
import { rotationHandler } from "./rotationHandler.js";
import { splitCanvasAxisAlignedSegmentHandler } from "./splitCanvasAxisAlignedSegmentHandler.js";
import { splitCanvasBezierSegmentHandler } from "./splitCanvasBezierSegmentHandler.js";
import { splitCanvasLineSegmentHandler } from "./splitCanvasLineSegmentHandler.js";
import { toolboxHandler } from "./toolboxHandler.js";

/**
 * Registry for all edit handlers
 */
export class EditHandlerRegistry {
    /**
     * Map of all edit handlers which are registered by their exact type
     */
    private readonly exactMatchingHandlers: Map<string, EditHandler<any>> = new Map();

    /**
     * List of all edit handlers which are registered by their regex type
     */
    private readonly regexMatchingHandlers: EditHandler<any>[] = [];

    /**
     * Creates a new TransactionalEditRegistory
     *
     * @param handler the edit handlers to register
     */
    constructor(handler: EditHandler<any>[]) {
        handler.forEach((edit) => {
            if (typeof edit.type === "string") {
                this.exactMatchingHandlers.set(edit.type, edit);
            } else {
                this.regexMatchingHandlers.push(edit);
            }
        });
    }

    /**
     * Returns the edit handler for the given type.
     * If no handler is found for the type, an error is thrown.
     *
     * @param type the type of the edit to get the handler for
     * @returns the edit handler
     */
    getEditHandler(type: string): EditHandler<any> | undefined {
        return (
            this.exactMatchingHandlers.get(type) ??
            this.regexMatchingHandlers.find((handler) => handler.type.test(type))
        );
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
    rotationHandler,
    resizeWidth,
    resizeHeight,
    splitCanvasLineSegmentHandler,
    splitCanvasAxisAlignedSegmentHandler,
    splitCanvasBezierSegmentHandler,
    toolboxHandler
]);
