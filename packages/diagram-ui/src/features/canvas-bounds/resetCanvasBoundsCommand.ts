import { injectable, inject } from "inversify";
import { Command, CommandExecutionContext, CommandReturn, TYPES } from "sprotty";
import { Bounds } from "sprotty-protocol";
import { ResetCanvasBoundsAction } from "./resetCanvasBoundsAction.js";

/**
 * Command for ResetCanvasBoundsAction
 */
@injectable()
export class ResetCanvasBoundsCommand extends Command {
    static readonly KIND = ResetCanvasBoundsAction.KIND;

    @inject(TYPES.Action) private action!: ResetCanvasBoundsAction;

    override execute(context: CommandExecutionContext): CommandReturn {
        context.root.canvasBounds = Bounds.EMPTY;
        return context.root;
    }

    override undo(context: CommandExecutionContext): CommandReturn {
        return context.root;
    }

    override redo(context: CommandExecutionContext): CommandReturn {
        return context.root;
    }
}
