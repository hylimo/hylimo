import type { SharedSettings } from "@hylimo/diagram-protocol";
import { SettingsUpdatedAction } from "@hylimo/diagram-protocol";
import { injectable } from "inversify";
import type { Action } from "sprotty-protocol";
import type { IActionHandler } from "sprotty";

/**
 * Provider which manages the settings
 * Also acts as the handler for SettingsUpdatedAction
 */
@injectable()
export class SettingsProvider implements IActionHandler {
    /**
     * The current settings
     */
    settings?: SharedSettings;

    /**
     * Handles an action by updating the settings if it's a SettingsUpdatedAction
     *
     * @param action the action to handle
     */
    handle(action: Action): void {
        if (SettingsUpdatedAction.is(action)) {
            this.settings = action.settings;
        }
    }
}
