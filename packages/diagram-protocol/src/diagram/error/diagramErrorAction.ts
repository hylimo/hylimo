import type { Action } from "sprotty-protocol";
import type { Diagnostic as LspDiagnostic } from "vscode-languageserver-protocol";

/**
 * Type alias for LSP Diagnostic to avoid direct LSP dependency in consumers
 */
export type Diagnostic = LspDiagnostic;

/**
 * Action to notify the UI about an error in the diagram
 */
export interface DiagramErrorAction extends Action {
    kind: typeof DiagramErrorAction.KIND;
    /**
     * Array of error diagnostics
     */
    diagnostics: Diagnostic[];
}

export namespace DiagramErrorAction {
    /**
     * Kind of DiagramErrorActions
     */
    export const KIND = "DiagramErrorAction";

    /**
     * Checks if the action is a DiagramErrorAction
     *
     * @param action the action to check
     * @returns true if it is a DiagramErrorAction
     */
    export function is(action: Action): action is DiagramErrorAction {
        return action.kind === KIND;
    }
}
