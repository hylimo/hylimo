import type { SModelElementImpl } from "sprotty";
import type { Action } from "sprotty-protocol";
import { PointerListener } from "../contrib/pointer-tool.js";
import { inject } from "inversify";
import { TYPES } from "../types.js";
import type { ToolTypeProvider } from "../toolbox/toolState.js";
import type { KeyState } from "../key-state/keyState.js";
import { ToolboxToolType } from "../toolbox/toolType.js";

/**
 * Pointer listener that captures the pointer when the pointer is down on an element
 */
export class PointerCapturePointerListener extends PointerListener {
    /**
     * The tool type provider to determine the current tool type
     */
    @inject(TYPES.ToolTypeProvider) protected readonly toolTypeProvider!: ToolTypeProvider;

    /**
     * The key state to check if the space key is pressed
     */
    @inject(TYPES.KeyState) protected keyState!: KeyState;

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

    override pointerDown(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[] {
        if (this.toolTypeProvider.toolType !== ToolboxToolType.CONNECT || this.isForcedScroll(event)) {
            (event.target as HTMLElement | undefined)?.setPointerCapture(event.pointerId);
        }
        return [];
    }
}
