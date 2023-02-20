import { IncrementalUpdateAction } from "@hylimo/diagram-common";
import { injectable, inject } from "inversify";
import { Command, CommandExecutionContext, CommandReturn, TYPES } from "sprotty";

@injectable()
export class IncrementalUpdateModelCommand extends Command {
    static readonly KIND = IncrementalUpdateAction.KIND;

    constructor(@inject(TYPES.Action) private readonly action: IncrementalUpdateAction) {
        super();
    }

    override execute(context: CommandExecutionContext): CommandReturn {
        for (const update of this.action.updates) {
            const element = context.root.index.getById(update.target);
            if (element !== undefined) {
                Object.assign(element, update);
            }
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
