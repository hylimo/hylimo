import { injectable } from "inversify";
import { BringToFrontAction, Command, CommandExecutionContext, CommandReturn } from "sprotty";

/**
 * No-op command for bringToFront
 */
@injectable()
export class NoOpBringToFrontCommand extends Command {
    static readonly KIND = BringToFrontAction.KIND;

    execute(context: CommandExecutionContext): CommandReturn {
        return context.root;
    }
    undo(context: CommandExecutionContext): CommandReturn {
        return context.root;
    }
    redo(context: CommandExecutionContext): CommandReturn {
        return context.root;
    }
}
