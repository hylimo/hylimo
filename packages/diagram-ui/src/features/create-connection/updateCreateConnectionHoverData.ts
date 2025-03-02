import type { Action } from "sprotty-protocol";
import type { CreateConnectionHoverData } from "./createConnectionHoverData.js";
import type { CommandExecutionContext, CommandReturn } from "sprotty";
import { Command } from "sprotty";
import { inject, injectable } from "inversify";
import type { SRoot } from "../../model/sRoot.js";
import { TYPES } from "../types.js";

/**
 * Action to update the connection preview based on the current mouse position and/or shift status
 */
export interface UpdateCreateConnectionHoverDataAction extends Action {
    kind: typeof UpdateCreateConnectionHoverDataAction.KIND;
    /**
     * The data
     */
    data?: CreateConnectionHoverData;
}

export namespace UpdateCreateConnectionHoverDataAction {
    /**
     * Kind of UpdateCreateConnectionHoverDataAction
     */
    export const KIND = "updateCreateConnectionHoverDataAction";
}

/**
 * Command for UpdateCreateConnectionHoverDataAction
 * Updates the connection preview provider of the root element
 */
@injectable()
export class UpdateCreateConnectionHoverDataCommand extends Command {
    static readonly KIND = UpdateCreateConnectionHoverDataAction.KIND;

    /**
     * The action to execute
     */
    @inject(TYPES.Action) private action!: UpdateCreateConnectionHoverDataAction;

    override execute(context: CommandExecutionContext): CommandReturn {
        const root = context.root as SRoot;
        root.createConnectionHoverData = this.action.data;
        return context.root;
    }

    override undo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("Undo is not supported");
    }

    override redo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("Redo is not supported");
    }
}
