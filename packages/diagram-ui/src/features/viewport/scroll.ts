import { SModelElementImpl, ScrollMouseListener as SprottyScrollMouseListener } from "sprotty";
import { injectable, inject } from "inversify";
import { Action } from "sprotty-protocol";
import { TYPES } from "../types.js";
import { ToolTypeProvider } from "../toolbox/toolState.js";
import { ToolboxToolType } from "../toolbox/toolType.js";
import { UpdateCursorAction } from "../cursor/cursor.js";

/**
 * Extends the Sprotty ScrollMouseListener to handle drag move correctly when in drag mode
 */
@injectable()
export class ScrollMouseListener extends SprottyScrollMouseListener {
    /**
     * The tool type provider to determine the current tool type
     */
    @inject(TYPES.ToolTypeProvider) protected readonly toolTypeProvider!: ToolTypeProvider;

    override mouseDown(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        let targetOrRoot = target;
        const toolType = this.toolTypeProvider.toolType;
        if (toolType === ToolboxToolType.BOX_SELECT || (toolType === ToolboxToolType.CONNECT && event.button !== 1)) {
            return [];
        }
        if (event.button === 1 || this.toolTypeProvider.toolType === ToolboxToolType.HAND) {
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
        const result = super.mouseUp(target, event);
        const updateCursorAction: UpdateCursorAction = {
            kind: UpdateCursorAction.KIND,
            moveCursor: null
        };
        result.push(updateCursorAction);
        return result;
    }
}
