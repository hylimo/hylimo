import { ContainerModule } from "inversify";
import { configureActionHandler } from "sprotty";
import { SettingsUpdatedAction } from "@hylimo/diagram-protocol";
import { TYPES } from "../types.js";
import { SettingsProvider } from "./settingsProvider.js";

/**
 * Settings module for managing shared settings
 */
export const settingsModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(SettingsProvider).toSelf().inSingletonScope();
    bind(TYPES.SettingsProvider).toService(SettingsProvider);
    configureActionHandler({ bind, isBound }, SettingsUpdatedAction.KIND, SettingsProvider);
});
