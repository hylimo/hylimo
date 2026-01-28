import type { ConnectionEdit, ConnectionEnd, SharedSettings } from "@hylimo/diagram-protocol";
import type { SModelElementImpl } from "sprotty";
import { findParentByFeature } from "sprotty";
import { MoveHandler, type HandleMoveResult } from "../move/moveHandler.js";
import type { Matrix } from "transformation-matrix";
import { isLineProvider } from "./lineProvider.js";
import { projectPointOnLine } from "../../base/projectPointOnLine.js";
import type { ElementFinder } from "../element-finder/elementFinder.js";

/**
 * Move handler for creating connections
 */
export class CreateConnectionMoveHandler extends MoveHandler {
    /**
     * Creates a new CreateConnectionMoveHandler based on the start of the connection
     * and the edit to create the connection
     *
     * @param edit the edit to create the connection
     * @param start the start of the connection
     * @param transformationMatrix matrix applied to event coordinates
     */
    constructor(
        private readonly edit: `connection/${string}`,
        private readonly start: ConnectionEnd,
        private readonly settings: SharedSettings | undefined,
        private readonly elementFinder: ElementFinder,
        transformationMatrix: Matrix
    ) {
        super(transformationMatrix, "cursor-crosshair", false);
    }

    override handleMove(x: number, y: number, event: MouseEvent, target: SModelElementImpl): HandleMoveResult {
        const elementAtPoint = this.elementFinder.findElementAtPoint(target.root, event.clientX, event.clientY);
        const lineProvider = findParentByFeature(elementAtPoint ?? target, isLineProvider);
        let end: ConnectionEnd = { x, y };
        if (lineProvider != undefined) {
            const root = lineProvider.root;
            const line = root.layoutEngine.layoutLine(lineProvider, root.id);
            const projection = projectPointOnLine(
                { x, y },
                line,
                {
                    settings: this.settings ?? {},
                    hasSegment: false
                },
                0
            );
            end = {
                ...end,
                expression: lineProvider.editExpression!,
                pos: projection.pos
            };
        }
        const edits = [
            {
                types: [this.edit],
                values: {
                    start: this.start,
                    end
                },
                elements: [target.root.id]
            } satisfies ConnectionEdit
        ];
        return { edits };
    }
}
