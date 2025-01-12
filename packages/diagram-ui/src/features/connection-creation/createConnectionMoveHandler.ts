import { ConnectionEdit, ConnectionEnd, Edit } from "@hylimo/diagram-protocol";
import { findParentByFeature, SModelElementImpl } from "sprotty";
import { MoveHandler } from "../move/moveHandler.js";
import { Matrix } from "transformation-matrix";
import { isCreateConnectionTarget } from "./connectionCreationMouseListener.js";
import { LineEngine } from "@hylimo/diagram-common";

export class CreateConnectionMoveHandler extends MoveHandler {
    constructor(
        private readonly edit: `connection/${string}`,
        private readonly start: ConnectionEnd,
        transformationMatrix: Matrix
    ) {
        super(transformationMatrix, false);
    }

    override generateEdits(x: number, y: number, event: MouseEvent, target: SModelElementImpl): Edit[] {
        const lineProvider = findParentByFeature(target, isCreateConnectionTarget);
        let end: ConnectionEnd;
        if (lineProvider != undefined) {
            const root = lineProvider.root;
            const line = root.layoutEngine.layoutLine(lineProvider, root.id);
            const projection = LineEngine.DEFAULT.projectPoint({ x, y }, line);
            end = {
                expression: lineProvider.editExpression!,
                pos: projection.pos
            };
        } else {
            end = {
                x,
                y
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
