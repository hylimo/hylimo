import { Command, CommandExecutionContext, CommandReturn, TYPES as SPROTTY_TYPES } from "sprotty";
import { CreateAndMoveAction } from "./createAndMoveAction.js";
import { injectable, inject } from "inversify";
import { TYPES } from "../types.js";
import { CreateAndMoveMouseListener } from "./createAndMoveMouseListener.js";
import { SRoot } from "../../model/sRoot.js";

/**
 * Command for CreateMoveAction
 */
@injectable()
export class CreateAndMoveCommand extends Command {
    static readonly KIND = CreateAndMoveAction.KIND;

    /**
     * The action to perform
     */
    @inject(SPROTTY_TYPES.Action) private action!: CreateAndMoveAction;

    /**
     * The listener to activate
     */
    @inject(TYPES.CreateAndMoveMouseListener) private createMoveMouseListener!: CreateAndMoveMouseListener;

    override execute(context: CommandExecutionContext): CommandReturn {
        this.createMoveMouseListener.startMove(context.root as SRoot, this.action);
        return context.root;
    }

    override undo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("Undo is not supported");
    }

    override redo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("Redo is not supported");
    }
}
