import {
    NavigateToSourceAction,
    ToolboxEditPredictionRequestAction,
    TransactionalAction,
    UpdateEditorConfigAction
} from "@hylimo/diagram-protocol";
import { Action, DiagramServer as SprottyDiagramServer, DiagramServices } from "sprotty-protocol";
import { Diagram } from "../diagram/diagram.js";

/**
 * Custom DiagramServer which redirects TransactionalActions to the diagram
 */
export class DiagramServer extends SprottyDiagramServer {
    /**
     * Crates a new DiagramServer for the specified diagram
     *
     * @param dispatch provided to parent
     * @param services provided to parent
     * @param diagram the diagram to redirect TransactionalActions to
     */
    constructor(
        dispatch: <A extends Action>(action: A) => Promise<void>,
        services: DiagramServices,
        private readonly diagram: Diagram
    ) {
        super(dispatch, services);
    }

    protected override async handleAction(action: Action): Promise<void> {
        if (TransactionalAction.isTransactionalAction(action)) {
            return this.diagram.handleTransactionalAction(action);
        } else if (NavigateToSourceAction.is(action)) {
            return this.diagram.handleNavigateToSourceAction(action);
        } else if (UpdateEditorConfigAction.is(action)) {
            return this.diagram.handleUpdateEditorConfigAction(action);
        } else if (ToolboxEditPredictionRequestAction.is(action)) {
            this.dispatch(await this.diagram.handleToolboxEditPredictionRequestAction(action));
        } else {
            return super.handleAction(action);
        }
    }
}
