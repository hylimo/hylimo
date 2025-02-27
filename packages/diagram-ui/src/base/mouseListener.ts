import { inject } from "inversify";
import { MouseListener as SprottyMouseListener } from "sprotty";
import { TYPES } from "../features/types.js";
import { ToolTypeProvider } from "../features/toolbox/toolState.js";
import { KeyState } from "../features/key-state/keyState.js";
import { isRegularInteractionTool } from "../features/toolbox/toolType.js";

/**
 * Mouse listener which provides helper methods to determine the current tool type and if the scroll is forced.
 */
export class MouseListener extends SprottyMouseListener {
    /**
     * The tool type provider to determine the current tool type
     */
    @inject(TYPES.ToolTypeProvider) protected readonly toolTypeProvider!: ToolTypeProvider;

    /**
     * The key state to check if the space key is pressed
     */
    @inject(TYPES.KeyState) protected keyState!: KeyState;

    /**
     * Checks if the current tool type is a regular interaction tool.
     * Regular interaction tools to not change how users interact with the canvas.
     *
     * @returns true if the current tool is a regular interaction tool
     */
    protected isRegularInteractionTool(): boolean {
        return isRegularInteractionTool(this.toolTypeProvider.toolType);
    }

    /**
     * Checks if the scroll is forced by the user.
     * Scroll is forced if the space key is pressed or the middle mouse button is pressed.
     *
     * @param event the mouse event
     * @returns true if the scroll is forced
     */
    protected isForcedScroll(event: MouseEvent): boolean {
        return this.keyState.isSpacePressed || event.button === 1;
    }
}
