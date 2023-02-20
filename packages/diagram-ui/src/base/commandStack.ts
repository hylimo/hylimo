import { injectable } from "inversify";
import {
    CommandExecutionContext,
    CommandReturn,
    CommandStack as SprottyCommandStack,
    ICommand,
    SModelRoot
} from "sprotty";
import { CancelableCommandExecutionContext } from "../features/animation/cancelableCommandExecutionContext";
import { UpdateModelCommand } from "../features/update/updateModel";

/**
 * CommandStack with support for CancelableAnimations.
 * Also cancels SetModel after another SetModel
 */
@injectable()
export class CommandStack extends SprottyCommandStack {
    /**
     * Last propvided context
     */
    private lastContext?: CancelableCommandExecutionContext;

    protected override handleCommand(
        command: ICommand,
        operation: (context: CommandExecutionContext) => CommandReturn,
        beforeResolve: (command: ICommand, context: CommandExecutionContext) => void
    ): void {
        if (command instanceof UpdateModelCommand && this.lastContext != undefined) {
            CancelableCommandExecutionContext.setCanceled(this.lastContext);
        }
        super.handleCommand(command, operation, beforeResolve);
    }

    protected override createContext(currentModel: SModelRoot): CancelableCommandExecutionContext {
        const context = {
            ...super.createContext(currentModel),
            canceled: false
        };
        this.lastContext = context;
        return context;
    }
}
