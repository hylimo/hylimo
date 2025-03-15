import type { EditorConfig } from "@hylimo/diagram-protocol";
import { UpdateEditorConfigAction } from "@hylimo/diagram-protocol";
import { inject, injectable } from "inversify";
import type { IActionDispatcher } from "sprotty";
import { TYPES } from "../types.js";

/**
 * Manager which manges the editor config
 * Allows to retrieve and update the editor config
 */
@injectable()
export class ConfigManager {
    /**
     * The action dispatcher, used to dispatch config updates
     */
    @inject(TYPES.IActionDispatcher) private readonly actionDispatcher!: IActionDispatcher;

    /**
     * The current editor configuration
     */
    config?: EditorConfig;

    /**
     * Update the editor configuration
     * Also dispatches an UpdateEditorConfigAction
     * Does nothing if the config is not set yet
     *
     * @param update The partial update to apply
     */
    updateConfig(update: Partial<EditorConfig>): void {
        if (this.config != undefined) {
            this.config = { ...this.config, ...update };
            const action: UpdateEditorConfigAction = {
                kind: UpdateEditorConfigAction.KIND,
                config: this.config
            };
            this.actionDispatcher.dispatch(action);
        }
    }
}
