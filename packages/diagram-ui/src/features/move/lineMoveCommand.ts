import { LineMoveAction } from "@hylimo/diagram-common";
import { injectable, inject } from "inversify";
import { Command, CommandExecutionContext, CommandReturn, TYPES } from "sprotty";
import { SLinePoint } from "../../model/canvas/sLinePoint";
import { SRoot } from "../../model/sRoot";

/**
 * Command for LineMoveAction
 */
@injectable()
export class LineMoveCommand extends Command {
    static readonly KIND = LineMoveAction.KIND;

    constructor(@inject(TYPES.Action) private readonly action: LineMoveAction) {
        super();
    }

    override execute(context: CommandExecutionContext): CommandReturn {
        (context.root as SRoot).changeRevision++;
        const point = context.root.index.getById(this.action.point);
        (point as SLinePoint).pos = this.action.pos;
        return context.root;
    }

    override undo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("undo is not supported");
    }

    override redo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("redo is not supported");
    }
}
