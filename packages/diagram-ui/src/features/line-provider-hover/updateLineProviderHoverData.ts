import { Action } from "sprotty-protocol";
import { LineProviderHoverData } from "./lineProviderHoverData.js";
import { Command, CommandExecutionContext, CommandReturn, TYPES } from "sprotty";
import { inject } from "inversify";
import { SRoot } from "../../model/sRoot.js";

/**
 * Action to update the connection preview based on the current mouse position and/or shift status
 */
export interface UpdateLineProviderHoverDataAction extends Action {
    kind: typeof UpdateLineProviderHoverDataAction.KIND;
    /**
     * Whether the preview is currently visible.
     */
    isVisible: boolean;
    /**
     * The data provider and the id of the target
     * If undefined, the provider of the root element is used
     */
    providerWithTarget?: {
        provider: () => LineProviderHoverData;
        target: string;
    } | null;
}

export namespace UpdateLineProviderHoverDataAction {
    /**
     * Kind of UpdateLineProviderHoverDataActions
     */
    export const KIND = "updateLineProviderHoverData";
}

/**
 * Command for UpdateLineProviderHoverDataAction
 * Updates the connection preview provider of the root element
 */
export class UpdateLineProviderHoverDataCommand extends Command {
    static readonly KIND = UpdateLineProviderHoverDataAction.KIND;

    /**
     * The action to execute
     */
    @inject(TYPES.Action) private action!: UpdateLineProviderHoverDataAction;

    override execute(context: CommandExecutionContext): CommandReturn {
        const root = context.root as SRoot;
        const targetAndProvider = this.action.providerWithTarget ?? root.lineProviderHoverDataProvider;
        if (this.action.providerWithTarget === null || targetAndProvider == undefined) {
            root.lineProviderHoverDataProvider = undefined;
        } else {
            root.lineProviderHoverDataProvider = {
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
