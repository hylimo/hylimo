import { RotationAction } from "@hylimo/diagram-common";
import { injectable, inject } from "inversify";
import { Command, CommandExecutionContext, CommandReturn, TYPES } from "sprotty";
import { SCanvasElement } from "../../../model/canvas/sCanvasElement";
import { SRoot } from "../../../model/sRoot";

/**
 * Command for RotationAction
 */
@injectable()
export class RotationCommand extends Command {
    static readonly KIND = RotationAction.KIND;

    constructor(@inject(TYPES.Action) private readonly action: RotationAction) {
        super();
    }

    override execute(context: CommandExecutionContext): CommandReturn {
        (context.root as SRoot).changeRevision++;
        const element = context.root.index.getById(this.action.element);
        (element as SCanvasElement).rotation = this.action.rotation;
        return context.root;
    }

    override undo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("undo is not supported");
    }

    override redo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("redo is not supported");
    }
}
