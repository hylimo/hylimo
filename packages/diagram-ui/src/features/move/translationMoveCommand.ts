import { TranslationMoveAction } from "@hylimo/diagram-common";
import { injectable, inject } from "inversify";
import { Command, CommandExecutionContext, CommandReturn, TYPES } from "sprotty";
import { SAbsolutePoint } from "../../model/canvas/sAbsolutePoint";
import { SRelativePoint } from "../../model/canvas/sRelativePoint";

/**
 * Resolved version of TranslationMoveAction
 */
interface ResolvedTranslationMoveAction {
    /**
     * Absolute points in points
     */
    absolutePoints: SAbsolutePoint[];
    /**
     * Relative points in points
     */
    relativePoints: SRelativePoint[];
}

/**
 * Command for TranslationMoveAction
 */
@injectable()
export class TranslationMoveCommand extends Command {
    static readonly KIND = TranslationMoveAction.KIND;

    /**
     * Cached resolved action
     */
    resolvedAction?: ResolvedTranslationMoveAction;

    constructor(@inject(TYPES.Action) private readonly action: TranslationMoveAction) {
        super();
    }

    execute(context: CommandExecutionContext): CommandReturn {
        const points = this.action.points.map((point) => context.root.index.getById(point));
        this.resolvedAction = {
            absolutePoints: points.filter((point) => point instanceof SAbsolutePoint) as SAbsolutePoint[],
            relativePoints: points.filter((point) => point instanceof SRelativePoint) as SRelativePoint[]
        };
        return this.redo(context);
    }

    undo(context: CommandExecutionContext): CommandReturn {
        if (this.resolvedAction == undefined) {
            throw new Error("Command not executed yet");
        }
        for (const point of this.resolvedAction.absolutePoints) {
            point.x -= this.action.deltaOffsetX;
            point.y -= this.action.deltaOffsetY;
        }
        for (const point of this.resolvedAction.relativePoints) {
            point.offsetX -= this.action.deltaOffsetX;
            point.offsetY -= this.action.deltaOffsetY;
        }
        return context.root;
    }

    redo(context: CommandExecutionContext): CommandReturn {
        if (this.resolvedAction == undefined) {
            throw new Error("Command not executed yet");
        }
        for (const point of this.resolvedAction.absolutePoints) {
            point.x += this.action.deltaOffsetX;
            point.y += this.action.deltaOffsetY;
        }
        for (const point of this.resolvedAction.relativePoints) {
            point.offsetX += this.action.deltaOffsetX;
            point.offsetY += this.action.deltaOffsetY;
        }
        return context.root;
    }
}
