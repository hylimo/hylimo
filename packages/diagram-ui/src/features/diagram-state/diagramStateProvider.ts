import { injectable } from "inversify";
import type { IActionHandler, ICommand } from "sprotty";
import type { Action } from "sprotty-protocol";
import { SetModelAction, UpdateModelAction } from "sprotty-protocol";
import { DiagramErrorAction, type Diagnostic } from "@hylimo/diagram-protocol";

/**
 * Error state of the diagram
 */
export interface ErrorState {
    /**
     * Array of error diagnostics
     */
    diagnostics: Diagnostic[];
}

/**
 * Provides the current state of the diagram, tracking whether it is in a valid or error state.
 * Listens to actions to update the state accordingly.
 */
@injectable()
export class DiagramStateProvider implements IActionHandler {
    /**
     * Whether the diagram is in a valid state.
     * False when an error has occurred.
     */
    private _valid: boolean = false;

    /**
     * Gets whether the diagram is in a valid state
     */
    get valid(): boolean {
        return this._valid;
    }

    handle(action: Action): ICommand | Action | void {
        if (DiagramErrorAction.is(action)) {
            this._valid = false;
        } else if (action.kind === UpdateModelAction.KIND || action.kind === SetModelAction.KIND) {
            this._valid = true;
        }
    }
}
