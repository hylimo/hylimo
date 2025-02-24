import { ProjectionResult } from "@hylimo/diagram-common";
import { Command, CommandExecutionContext, CommandReturn } from "sprotty";
import { Action } from "sprotty-protocol";
import { inject } from "inversify";
import { TYPES } from "../types.js";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";

/**
 * Updates the preview data for canvas connection split
 */
export interface UpdateSplitConnectionPreviewDataAction extends Action {
    readonly kind: typeof UpdateSplitConnectionPreviewDataAction.KIND;
    /**
     * The id of the connection the preview data is associated with
     */
    connectionId: string;
    /**
     * The preview data for the split
     */
    previewData: ProjectionResult | undefined;
}

export namespace UpdateSplitConnectionPreviewDataAction {
    export const KIND = "updateSplitConnectionPreviewData";
}

/**
 * Command for UpdateSplitConnectionPreviewDataAction
 * Updates the split preview data of a connection
 */
export class UpdateSplitConnectionPreviewDataCommand extends Command {
    static readonly KIND = UpdateSplitConnectionPreviewDataAction.KIND;

    /**
     * The action to execute
     */
    @inject(TYPES.Action) private action!: UpdateSplitConnectionPreviewDataAction;

    override execute(context: CommandExecutionContext): CommandReturn {
        const connection = context.root.index.getById(this.action.connectionId);
        if (connection != undefined && connection instanceof SCanvasConnection) {
            connection.splitPreviewData = this.action.previewData;
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
