import type { SModelElementImpl } from "sprotty";
import { ScrollMouseListener as SprottyScrollMouseListener } from "sprotty";
import { injectable, inject } from "inversify";
import type { Action } from "sprotty-protocol";
import { TYPES } from "../types.js";
import type { ToolTypeProvider } from "../toolbox/toolState.js";
import { ToolboxToolType } from "../toolbox/toolType.js";
import { UpdateCursorAction } from "../cursor/cursor.js";
import type { KeyState } from "../key-state/keyState.js";

/**
 * Extends the Sprotty ScrollMouseListener to handle drag move correctly when in drag mode
 */
@injectable()
export class ScrollMouseListener extends SprottyScrollMouseListener {
    /**
     * The tool type provider to determine the current tool type
     */
    @inject(TYPES.ToolTypeProvider) protected readonly toolTypeProvider!: ToolTypeProvider;

    /**
     * The key state to check if the space key is pressed
     */
    @inject(TYPES.KeyState) protected keyState!: KeyState;

    override mouseDown(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        let targetOrRoot = target;
        const toolType = this.toolTypeProvider.toolType;
        const forceScroll = this.keyState.isSpacePressed || event.button === 1;
        if ((toolType === ToolboxToolType.BOX_SELECT || toolType === ToolboxToolType.CONNECT) && !forceScroll) {
            return [];
        }
        if (forceScroll || this.toolTypeProvider.toolType === ToolboxToolType.HAND) {
            targetOrRoot = target.root;
        }
        const result = super.mouseDown(targetOrRoot, event);
        if (this.lastScrollPosition != undefined) {
            const updateCursorAction: UpdateCursorAction = {
                kind: UpdateCursorAction.KIND,
                moveCursor: "cursor-grabbing"
            };
            result.push(updateCursorAction);
        }
        return result;
    }

    override mouseUp(target: SModelElementImpl, event: MouseEvent): Action[] {
        const result: Action[] = [];
        if (this.lastScrollPosition != undefined) {
            const updateCursorAction: UpdateCursorAction = {
                kind: UpdateCursorAction.KIND,
                moveCursor: null
            };
            result.push(updateCursorAction);
        }
        result.push(...super.mouseUp(target, event));
        return result;
    }
}
