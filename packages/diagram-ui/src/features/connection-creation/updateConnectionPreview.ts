import { Action } from "sprotty-protocol";
import { CreateConnectionData } from "./createConnectionData.js";
import { Command, CommandExecutionContext, CommandReturn, TYPES } from "sprotty";
import { inject } from "inversify";
import { SRoot } from "../../model/sRoot.js";

/**
 * Action to update the connection preview based on the current mouse position and/or shift status
 */
export interface UpdateConnectionPreviewAction extends Action {
    kind: typeof UpdateConnectionPreviewAction.KIND;
    /**
     * Whether the preview is currently visible.
     */
    isVisible: boolean;
    /**
     * The data provider and the id of the target
     * If undefined, the provider of the root element is used
     */
    providerWithTarget?: {
        provider: () => CreateConnectionData;
        target: string;
    } | null;
}

export namespace UpdateConnectionPreviewAction {
    /**
     * Kind of UpdateConnectionPreviewActions
     */
    export const KIND = "updateConnectionPreview";
}

/**
 * Command for UpdateConnectionPreviewAction
 * Updates the connection preview provider of the root element
 */
export class UpdateConnectionPreviewCommand extends Command {
    static readonly KIND = UpdateConnectionPreviewAction.KIND;

    /**
     * The action to execute
     */
    @inject(TYPES.Action) private action!: UpdateConnectionPreviewAction;

    override execute(context: CommandExecutionContext): CommandReturn {
        const root = context.root as SRoot;
        const targetAndProvider = this.action.providerWithTarget ?? root.createConnectionProvider;
        if (this.action.providerWithTarget === null || targetAndProvider == undefined) {
            root.createConnectionProvider = undefined;
        } else {
            root.createConnectionProvider = {
                isVisible: this.action.isVisible,
                provider: targetAndProvider.provider,
                target: targetAndProvider.target
            };
        }
        return context.root;
    }

    override undo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("Undo is not supported");
    }

    override redo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("Redo is not supported");
    }
}
