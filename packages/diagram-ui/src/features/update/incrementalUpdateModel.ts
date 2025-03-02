import { IncrementalUpdateAction } from "@hylimo/diagram-protocol";
import { injectable, inject } from "inversify";
import type { CommandExecutionContext, CommandReturn } from "sprotty";
import { Command } from "sprotty";
import type { SRoot } from "../../model/sRoot.js";
import { TYPES } from "../types.js";

@injectable()
export class IncrementalUpdateModelCommand extends Command {
    static readonly KIND = IncrementalUpdateAction.KIND;

    @inject(TYPES.Action) private action!: IncrementalUpdateAction;

    override execute(context: CommandExecutionContext): CommandReturn {
        const root = context.root as SRoot;
        root.changeRevision++;
        root.sequenceNumber = this.action.sequenceNumber;
        root.incrementalUpdateCount++;
        for (const update of this.action.updates) {
            const element = context.root.index.getById(update.target);
            if (element !== undefined) {
                Object.assign(element, update.changes);
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
