import { ContainerModule } from "inversify";
import { configureCommand } from "sprotty";
import { TYPES } from "../types.js";
import { ConfigManager } from "./configManager.js";
import { EditorConfigUpdatedCommand } from "./editorConfigUpdatedCommand.js";

/**
 * Config module for managing the editor config
 */
export const configModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(ConfigManager).toSelf().inSingletonScope();
    bind(TYPES.ConfigManager).toService(ConfigManager);
    configureCommand({ bind, isBound }, EditorConfigUpdatedCommand);
});
