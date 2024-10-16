import { injectable } from "inversify";
import {
    CommandExecutionContext,
    CommandReturn,
    CommandStack as SprottyCommandStack,
    ICommand,
    SModelRootImpl
} from "sprotty";
import {
    CancelState,
    CancelableCommandExecutionContext
} from "../features/animation/cancelableCommandExecutionContext.js";
import { UpdateModelCommand } from "../features/update/updateModel.js";
import { IncrementalUpdateModelCommand } from "../features/update/incrementalUpdateModel.js";

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

    protected override createContext(currentModel: SModelRootImpl): CancelableCommandExecutionContext {
        const context = {
            ...super.createContext(currentModel),
            cancelState: CancelState.RUNNING
        };
        this.lastContext = context;
        return context;
    }
}
