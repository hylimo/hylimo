import { inject, injectable } from "inversify";
import { findParentByFeature, MouseListener, SModelElementImpl } from "sprotty";
import { Action } from "sprotty-protocol";
import { SCanvasElement } from "../../model/canvas/sCanvasElement.js";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import { UpdateCreateConnectionDataAction } from "./updateCreateConnectionData.js";
import { CreateConnectionData } from "./createConnectionData.js";
import { LineEngine } from "@hylimo/diagram-common";
import { applyToPoint } from "transformation-matrix";
import { TransactionalMoveAction } from "../move/transactionalMoveAction.js";
import { CreateConnectionMoveHandler } from "./createConnectionMoveHandler.js";
import { TYPES } from "../types.js";
import { ConnectionEditProvider } from "../toolbox/connectionEditProvider.js";

/**
 * Mouse listener for updating the connection creation UI based on mouse movements
 */
@injectable()
export class CreateConnectionMouseListener extends MouseListener {
    /**
     * Provides the selected connection edit expression
     */
    @inject(TYPES.ConnectionEditProvider) protected readonly connectionEditProvider!: ConnectionEditProvider;

    override mouseMove(target: SModelElementImpl, event: MouseEvent): Action[] {
        const canvasElement = findParentByFeature(target, isCreateConnectionTarget);
        if (canvasElement == undefined) {
            return [];
        }
        const action: UpdateCreateConnectionDataAction = {
            kind: UpdateCreateConnectionDataAction.KIND,
            isVisible: event.shiftKey && event.buttons === 0,
            providerWithTarget: {
                target: canvasElement.id,
                provider: () => this.createConnection(event, canvasElement)
            }
        };
        return [action];
    }

    override mouseOver(target: SModelElementImpl, event: MouseEvent): Action[] {
        const canvasElement = findParentByFeature(target, isCreateConnectionTarget);
        if (
            canvasElement != undefined ||
            (event.target as HTMLElement).classList.contains(CreateConnectionData.CLASS)
        ) {
            return [];
        }
        const action: UpdateCreateConnectionDataAction = {
            kind: UpdateCreateConnectionDataAction.KIND,
            isVisible: false,
            providerWithTarget: null
        };
        return [action];
    }

    override mouseDown(target: SModelElementImpl, event: MouseEvent): Action[] {
        const element = event.target as HTMLElement;
        if (
            !element.classList.contains(CreateConnectionData.CLASS) ||
            !(target instanceof SCanvasElement || target instanceof SCanvasConnection) ||
            target.editExpression == undefined
        ) {
            return [];
        }
        const startData = target.createConnectionProvider?.provider();
        if (startData == undefined) {
            return [];
        }
        const edit = this.connectionEditProvider.getConnectionEdit();
        if (edit == undefined) {
            return [];
        }
        const action: TransactionalMoveAction = {
            kind: TransactionalMoveAction.KIND,
            maxUpdatesPerRevision: 1,
            handlerProvider: () =>
                new CreateConnectionMoveHandler(
                    edit,
                    {
                        expression: target.editExpression!,
                        pos: startData.position
                    },
                    target.root.getMouseTransformationMatrix()
                )
        };
        return [action];
    }

    /**
     * Provides the connection creation data based on the current mouse position and the target element.
     *
     * @param event provider for the mouse position
     * @param target the target element
     * @returns the connection creation data
     */
    private createConnection(event: MouseEvent, target: SCanvasElement | SCanvasConnection): CreateConnectionData {
        const context = target.parent;
        const line = target.root.layoutEngine.layoutLine(target, context.id);
        const point = applyToPoint(context.getMouseTransformationMatrix(), { x: event.pageX, y: event.pageY });
        const nearest = LineEngine.DEFAULT.projectPoint(point, line);
        return {
            line,
            position: nearest.pos
        };
    }
}

/**
 * Checks if the element is a canvas element or connection with an edit expression
 *
 * @param target the target element
 * @returns true if the element is a canvas element or connection with an edit expression
 */
export function isCreateConnectionTarget(element: SModelElementImpl): element is SCanvasElement | SCanvasConnection {
    return (
        (element instanceof SCanvasElement || element instanceof SCanvasConnection) &&
        element.editExpression != undefined
    );
}
