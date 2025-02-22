import { injectable, inject } from "inversify";
import { SModelElementImpl, SelectMouseListener as SprottySelectMouseListener } from "sprotty";
import { ToolTypeProvider } from "../toolbox/toolState.js";
import { TYPES } from "../types.js";
import { Action } from "sprotty-protocol";
import { isRegularInteractionTool } from "../toolbox/toolType.js";

/**
 * SelectMouseListener that disables both mouseDown and mouseUp when the current tool is not a regular interaction tool
 */
@injectable()
export class SelectMouseListener extends SprottySelectMouseListener {
    /**
     * The tool type provider to determine the current tool type
     */
    @inject(TYPES.ToolTypeProvider) protected readonly toolTypeProvider!: ToolTypeProvider;

    override mouseDown(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        if (!isRegularInteractionTool(this.toolTypeProvider.toolType)) {
            return [];
        }
        return super.mouseDown(target, event);
    }

    override mouseUp(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        if (!isRegularInteractionTool(this.toolTypeProvider.toolType)) {
            return [];
        }
        return super.mouseUp(target, event);
    }
}
