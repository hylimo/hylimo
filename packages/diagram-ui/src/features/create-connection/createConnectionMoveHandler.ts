import { ConnectionEdit, ConnectionEnd, Edit } from "@hylimo/diagram-protocol";
import { findParentByFeature, SModelElementImpl } from "sprotty";
import { MoveHandler } from "../move/moveHandler.js";
import { Matrix } from "transformation-matrix";
import { isCreateConnectionTarget } from "./createConnectionMouseListener.js";
import { LineEngine } from "@hylimo/diagram-common";

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
        transformationMatrix: Matrix
    ) {
        super(transformationMatrix, false);
    }

    override generateEdits(x: number, y: number, event: MouseEvent, target: SModelElementImpl): Edit[] {
        const lineProvider = findParentByFeature(target, isCreateConnectionTarget);
        let end: ConnectionEnd = { x, y };
        if (lineProvider != undefined) {
            const root = lineProvider.root;
            const line = root.layoutEngine.layoutLine(lineProvider, root.id);
            const projection = LineEngine.DEFAULT.projectPoint({ x, y }, line);
            end = {
                ...end,
                expression: lineProvider.editExpression!,
                pos: projection.pos
            };
        }
        return [
            {
                types: [this.edit],
                values: {
                    start: this.start,
                    end
                },
                elements: [target.root.id]
            } satisfies ConnectionEdit
        ];
    }
}
