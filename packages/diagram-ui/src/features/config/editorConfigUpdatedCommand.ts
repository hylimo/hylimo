import { EditorConfigUpdatedAction } from "@hylimo/diagram-protocol";
import { inject, injectable } from "inversify";
import { Command, CommandExecutionContext, CommandReturn, TYPES as SPROTTY_TYPES } from "sprotty";
import { TYPES } from "../types.js";
import { ConfigManager } from "./configManager.js";

/**
 * Command for EditorConfigUpdatedAction
 */
@injectable()
export class EditorConfigUpdatedCommand extends Command {
    static readonly KIND = EditorConfigUpdatedAction.KIND;

    /**
     * The action to perform
     */
    @inject(SPROTTY_TYPES.Action) private action!: EditorConfigUpdatedAction;

    /**
     * The config manager where the config is stored
     */
    @inject(TYPES.ConfigManager) private configManager!: ConfigManager;

    override execute(context: CommandExecutionContext): CommandReturn {
        this.configManager.config = this.action.config;
        return context.root;
    }

    override undo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("Undo is not supported");
    }

    override redo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("Redo is not supported");
    }
}
