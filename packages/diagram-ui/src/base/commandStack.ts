import { injectable } from "inversify";
import {
    CommandExecutionContext,
    CommandReturn,
    CommandStack as SprottyCommandStack,
    ICommand,
    SModelRootImpl
} from "sprotty";
import { CancelableCommandExecutionContext } from "../features/animation/cancelableCommandExecutionContext.js";
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

    /**
     * The sequence number of the last cancelable command
     */
    private cancelCounter = -1;

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
                command instanceof IncrementalUpdateModelCommand,
                this.cancelCounter
            );
        }
        this.cancelCounter++;
        super.handleCommand(command, operation, beforeResolve);
    }

    protected override createContext(currentModel: SModelRootImpl): CancelableCommandExecutionContext {
        const originalContext = super.createContext(currentModel);
        const context: CancelableCommandExecutionContext = {
            root: originalContext.root,
            modelFactory: originalContext.modelFactory,
            logger: originalContext.logger,
            modelChanged: originalContext.modelChanged,
            syncer: originalContext.syncer,
            commandSequenceNumber: (this.lastContext?.commandSequenceNumber ?? -1) + 1,
            get duration(): number {
                return CancelableCommandExecutionContext.isCanceled(this) ? 0 : originalContext.duration;
            },
            set duration(value: number) {
                originalContext.duration = value;
            },
            cancelState: this.lastContext?.cancelState ?? {
                cancelUntil: -1,
                skipUntil: -1
            }
        };
        this.lastContext = context;
        return context;
    }
}
