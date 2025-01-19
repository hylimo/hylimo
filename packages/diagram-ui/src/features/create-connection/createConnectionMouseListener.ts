import { inject, injectable } from "inversify";
import { MouseListener, SModelElementImpl } from "sprotty";
import { Action, SelectAction } from "sprotty-protocol";
import { SCanvasElement } from "../../model/canvas/sCanvasElement.js";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import { LineEngine } from "@hylimo/diagram-common";
import { applyToPoint } from "transformation-matrix";
import { TransactionalMoveAction } from "../move/transactionalMoveAction.js";
import { CreateConnectionMoveHandler } from "./createConnectionMoveHandler.js";
import { TYPES } from "../types.js";
import { ConnectionEditProvider } from "../toolbox/connectionEditProvider.js";
import { EditableCanvasContentView } from "../../views/canvas/editableCanvasContentView.js";
import { LineProviderHoverData } from "../line-provider-hover/lineProviderHoverData.js";

/**
 * Mouse listener for updating the connection creation UI based on mouse movements
 */
@injectable()
export class CreateConnectionMouseListener extends MouseListener {
    /**
     * Provides the selected connection edit expression
     */
    @inject(TYPES.ConnectionEditProvider) protected readonly connectionEditProvider!: ConnectionEditProvider;

    override mouseDown(target: SModelElementImpl, event: MouseEvent): Action[] {
        const element = event.target as HTMLElement;
        if (
            !element.classList.contains(EditableCanvasContentView.CREATE_CONNECTION_CLASS) ||
            !(target instanceof SCanvasElement || target instanceof SCanvasConnection) ||
            target.editExpression == undefined
        ) {
            return [];
        }
        const startData = target.hoverDataProvider?.provider();
        if (startData == undefined) {
            return [];
        }
        const edit = this.connectionEditProvider.getConnectionEdit();
        if (edit == undefined) {
            return [];
        }
        const deselectAction: SelectAction = {
            kind: SelectAction.KIND,
            selectedElementsIDs: [],
            deselectedElementsIDs: [target.id]
        };
        return [deselectAction, this.generateStartCreateConnectionAction(target, startData, edit)];
    }

    /**
     * Generates the action to start the creation of a connection
     * based on the target element and the connection creation data.
     *
     * @param target the target element
     * @param startData the connection creation data
     * @param edit the connection edit to use
     * @returns the action to start the creation of a connection
     */
    private generateStartCreateConnectionAction(
        target: SCanvasElement | SCanvasConnection,
        startData: LineProviderHoverData,
        edit: `connection/${string}`
    ): TransactionalMoveAction {
        const { x, y } = applyToPoint(
            target.root.layoutEngine.localToAncestor(target.parent.id, target.root.id),
            LineEngine.DEFAULT.getPoint(startData.position, undefined, 0, startData.line)
        );
        return {
            kind: TransactionalMoveAction.KIND,
            maxUpdatesPerRevision: 1,
            handlerProvider: () =>
                new CreateConnectionMoveHandler(
                    edit,
                    {
                        x,
                        y,
                        expression: target.editExpression!,
                        pos: startData.position
                    },
                    target.root.getMouseTransformationMatrix()
                )
        };
    }
}
