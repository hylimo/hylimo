import { injectable, inject } from "inversify";
import type { SModelElementImpl } from "sprotty";
import { SelectMouseListener as SprottySelectMouseListener } from "sprotty";
import type { ToolTypeProvider } from "../toolbox/toolState.js";
import { TYPES } from "../types.js";
import type { Action } from "sprotty-protocol";
import { isRegularInteractionTool } from "../toolbox/toolType.js";
import type { KeyState } from "../key-state/keyState.js";

/**
 * SelectMouseListener that disables both mouseDown and mouseUp when the current tool is not a regular interaction tool
 */
@injectable()
export class SelectMouseListener extends SprottySelectMouseListener {
    /**
     * The tool type provider to determine the current tool type
     */
    @inject(TYPES.ToolTypeProvider) protected readonly toolTypeProvider!: ToolTypeProvider;

    /**
     * The key state to check if the space key is pressed
     */
    @inject(TYPES.KeyState) protected keyState!: KeyState;

    override mouseDown(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        if (!isRegularInteractionTool(this.toolTypeProvider.toolType) || this.keyState.isSpacePressed) {
            return [];
        }
        return super.mouseDown(target, event);
    }

    override mouseUp(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        if (!isRegularInteractionTool(this.toolTypeProvider.toolType) || this.keyState.isSpacePressed) {
            return [];
        }
        return super.mouseUp(target, event);
    }
}
