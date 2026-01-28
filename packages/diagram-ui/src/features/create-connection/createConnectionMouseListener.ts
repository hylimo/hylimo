import { inject, injectable } from "inversify";
import type { SModelElementImpl } from "sprotty";
import { findParentByFeature } from "sprotty";
import type { Action } from "sprotty-protocol";
import type { SCanvasElement } from "../../model/canvas/sCanvasElement.js";
import type { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import type { Point } from "@hylimo/diagram-common";
import { applyToPoint } from "transformation-matrix";
import { TransactionalMoveAction } from "../move/transactionalMoveAction.js";
import { CreateConnectionMoveHandler } from "./createConnectionMoveHandler.js";
import { TYPES } from "../types.js";
import type { ConnectionEditProvider } from "../toolbox/connectionEditProvider.js";
import type { CreateConnectionHoverData, LineProviderHoverData } from "./createConnectionHoverData.js";
import type { SRoot } from "../../model/sRoot.js";
import type { ConnectionEnd } from "@hylimo/diagram-protocol";
import { UpdateCreateConnectionHoverDataAction } from "./updateCreateConnectionHoverData.js";
import { ToolboxToolType } from "../toolbox/toolType.js";
import { isLineProvider } from "./lineProvider.js";
import type { TransactionStateProvider } from "../transaction/transactionStateProvider.js";
import { MouseListener } from "../../base/mouseListener.js";
import type { SettingsProvider } from "../settings/settingsProvider.js";
import { projectPointOnLine } from "../../base/projectPointOnLine.js";
import type { DiagramStateProvider } from "../diagram-state/diagramStateProvider.js";
import type { ElementFinder } from "../element-finder/elementFinder.js";

/**
 * Mouse listener for updating the connection creation UI based on mouse movements
 */
@injectable()
export class CreateConnectionMouseListener extends MouseListener {
    /**
     * Provides the selected connection edit expression
     */
    @inject(TYPES.ConnectionEditProvider) protected readonly connectionEditProvider!: ConnectionEditProvider;

    /**
     * The transaction state provider that keeps track of the current transaction state.
     */
    @inject(TYPES.TransactionStateProvider) protected transactionStateProvider!: TransactionStateProvider;

    /**
     * The settings provider
     */
    @inject(TYPES.SettingsProvider) protected settingsProvider!: SettingsProvider;

    /**
     * The diagram state provider
     */
    @inject(TYPES.DiagramStateProvider) protected diagramStateProvider!: DiagramStateProvider;

    /**
     * Helper to find elements at specific positions
     */
    @inject(TYPES.ElementFinder) protected elementFinder!: ElementFinder;

    override mouseDown(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (
            !this.diagramStateProvider.valid ||
            this.toolTypeProvider.toolType !== ToolboxToolType.CONNECT ||
            this.isForcedScroll(event)
        ) {
            return [];
        }
        const root = target.root as SRoot;
        const data = root.createConnectionHoverData;
        if (data == undefined) {
            return [];
        }
        const edit = this.connectionEditProvider.connectionEdit;
        if (edit == undefined) {
            return [];
        }
        return [this.generateStartCreateConnectionAction(root, data, edit)];
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
        root: SRoot,
        startData: CreateConnectionHoverData,
        edit: `connection/${string}`
    ): TransactionalMoveAction {
        let start: ConnectionEnd;
        if ("target" in startData) {
            start = {
                x: startData.x,
                y: startData.y,
                expression: startData.editExpression,
                pos: startData.position
            };
        } else {
            start = startData;
        }
        return {
            kind: TransactionalMoveAction.KIND,
            maxUpdatesPerRevision: 1,
            handlerProvider: () =>
                new CreateConnectionMoveHandler(
                    edit,
                    start,
                    this.settingsProvider.settings,
                    root.getMouseTransformationMatrix()
                )
        };
    }

    override mouseMove(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (
            this.toolTypeProvider.toolType !== ToolboxToolType.CONNECT &&
            !this.transactionStateProvider.isInCreateConnectionTransaction
        ) {
            return [];
        }
        let data: CreateConnectionHoverData;
        const elementAtPoint = this.elementFinder.findElementAtPoint(target.root, event.clientX, event.clientY);
        const lineProvider = findParentByFeature(elementAtPoint ?? target.root, isLineProvider);
        const root = target.root as SRoot;
        const rootPos = root.getPosition(event);
        if (lineProvider == undefined || lineProvider.editExpression == undefined) {
            data = rootPos;
        } else {
            data = this.generateLineProviderData(event, lineProvider, rootPos);
        }
        const action: UpdateCreateConnectionHoverDataAction = {
            kind: UpdateCreateConnectionHoverDataAction.KIND,
            data
        };
        return [action];
    }

    /**
     * Provides the line provider hover data based on the current mouse position and the target element.
     *
     * @param event provider for the mouse position
     * @param target the target element
     * @param rootPos the position of the event in the root coordinate system
     * @returns the line provider hover data
     */
    private generateLineProviderData(
        event: MouseEvent,
        target: SCanvasElement | SCanvasConnection,
        rootPos: Point
    ): LineProviderHoverData {
        const context = target.parent;
        const line = target.root.layoutEngine.layoutLine(target, context.id);
        const point = applyToPoint(context.getMouseTransformationMatrix(), { x: event.pageX, y: event.pageY });
        const projectionResult = projectPointOnLine(
            point,
            line,
            {
                settings: this.settingsProvider.settings ?? {},
                hasSegment: false
            },
            0
        );
        return {
            line,
            projectionResult,
            position: projectionResult.pos,
            target: target.id,
            ...rootPos,
            editExpression: target.editExpression!
        };
    }
}
