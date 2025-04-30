import type { Point } from "@hylimo/diagram-common";
import { MoveHandler, type HandleMoveResult } from "../../move/moveHandler.js";
import type { Matrix } from "transformation-matrix";
import type { Edit } from "@hylimo/diagram-protocol";

/**
 * Base class for all split segment move handlers
 */
export abstract class SplitSegmentMoveHandler extends MoveHandler {
    /**
     * Creates a new SplitSegmentMoveHandler
     *
     * @param transformationMatrix matrix applied to event coordinates
     * @param initialPoint the point to use when the mouse was only clicked but not dragged
     */
    constructor(
        transformationMatrix: Matrix,
        private readonly initialPoint: Point
    ) {
        super(transformationMatrix, "cursor-crosshair", false);
    }

    override handleMove(x: number, y: number): HandleMoveResult {
        const edits = this.generateSplitSegmentEdits(
            this.hasMoved ? x : this.initialPoint.x,
            this.hasMoved ? y : this.initialPoint.y
        );
        return { edits };
    }

    /**
     * Generates the split segment edits
     * Called by {@link handleMove}, but uses initialPoint when the mouse was not dragged yet
     *
     * @param x the x coordinate in the root canvas coordinate system
     * @param y the y coordinate in the root canvas coordinate system
     * @returns the generated edit
     */
    abstract generateSplitSegmentEdits(x: number, y: number): Edit[];
}
