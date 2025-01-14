import { Edit } from "@hylimo/diagram-protocol";
import { SRoot } from "../../model/sRoot.js";

/**
 * Handler which can handle create moves
 */
export abstract class CreateMoveHandler {
    /**
     * Generates the edits for the move
     *
     * @param x the x coordinate in the root canvas coordinate system
     * @param y the y coordinate in the root canvas coordinate system
     * @param committed if true, this is the final action of the transaction
     * @param root the current root element
     * @returns the generated edit
     */
    abstract generateEdit(x: number, y: number, committed: boolean, root: SRoot): Edit;
}
