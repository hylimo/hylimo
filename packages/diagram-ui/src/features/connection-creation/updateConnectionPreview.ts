import { Action } from "sprotty-protocol";
import { ConnectionCreationPreview } from "./connectionCreationPreview.js";
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
     * The preview itself.
     * If undefined, the provider of the root element is used
     */
    provider?: (() => ConnectionCreationPreview) | null;
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
        let provider: (() => ConnectionCreationPreview) | undefined;
        if (this.action.provider !== null) {
            provider = this.action.provider ?? root.connectionCreationPreviewProvider?.provider;
        }
        if (provider != undefined) {
            root.connectionCreationPreviewProvider = {
                isVisible: this.action.isVisible,
                provider
            };
        } else {
            root.connectionCreationPreviewProvider = undefined;
        }
        return root;
    }

    override undo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("Undo is not supported");
    }

    override redo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("Redo is not supported");
    }
}
