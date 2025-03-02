import { injectable } from "inversify";
import type { CommandExecutionContext, CommandReturn } from "sprotty";
import { Command } from "sprotty";
import { BringToFrontAction } from "sprotty-protocol";

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
