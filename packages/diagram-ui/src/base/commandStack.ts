import { injectable } from "inversify";
import {
    CommandExecutionContext,
    CommandReturn,
    CommandStack as SprottyCommandStack,
    ICommand,
    SModelRoot
} from "sprotty";
import {
    CancelState,
    CancelableCommandExecutionContext
} from "../features/animation/cancelableCommandExecutionContext";
import { UpdateModelCommand } from "../features/update/updateModel";
import { IncrementalUpdateModelCommand } from "../features/update/incrementalUpdateModel";

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
        if (
            (command instanceof UpdateModelCommand || command instanceof IncrementalUpdateModelCommand) &&
            this.lastContext != undefined
        ) {
            CancelableCommandExecutionContext.setCanceled(
                this.lastContext,
                command instanceof IncrementalUpdateModelCommand
            );
        }
        super.handleCommand(command, operation, beforeResolve);
    }

    protected override createContext(currentModel: SModelRoot): CancelableCommandExecutionContext {
        const context = {
            ...super.createContext(currentModel),
            cancelState: CancelState.RUNNING
        };
        this.lastContext = context;
        return context;
    }
}
