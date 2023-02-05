import { TranslationMoveAction } from "@hylimo/diagram-common";
import { injectable, inject } from "inversify";
import { Command, CommandExecutionContext, CommandReturn, TYPES } from "sprotty";
import { SAbsolutePoint } from "../../model/canvas/sAbsolutePoint";
import { SRelativePoint } from "../../model/canvas/sRelativePoint";
import { SRoot } from "../../model/sRoot";

/**
 * Command for TranslationMoveAction
 */
@injectable()
export class TranslationMoveCommand extends Command {
    static readonly KIND = TranslationMoveAction.KIND;

    constructor(@inject(TYPES.Action) private readonly action: TranslationMoveAction) {
        super();
    }

    override execute(context: CommandExecutionContext): CommandReturn {
        (context.root as SRoot).changeRevision++;
        const points = this.action.points.map((point) => context.root.index.getById(point));
        const absolutePoints = points.filter((point) => point instanceof SAbsolutePoint) as SAbsolutePoint[];
        const relativePoints = points.filter((point) => point instanceof SRelativePoint) as SRelativePoint[];
        for (const point of absolutePoints) {
            point.x += this.action.deltaOffsetX;
            point.y += this.action.deltaOffsetY;
        }
        for (const point of relativePoints) {
            point.offsetX += this.action.deltaOffsetX;
            point.offsetY += this.action.deltaOffsetY;
        }
        return context.root;
    }

    override undo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("undo is not supported");
    }

    override redo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("redo is not supported");
    }
}
