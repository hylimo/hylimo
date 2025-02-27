import { ToolboxToolType } from "./toolType.js";
import { injectable } from "inversify";

/**
 * Internal toolbox state
 * This type should only be used by the Toolbox itself
 * All other should access it as a ToolTypeProvider
 */
@injectable()
export class ToolState implements ToolTypeProvider {
    /**
     * The current tool type
     */
    toolType: ToolboxToolType = ToolboxToolType.CURSOR;
    /**
     * Whether the toolbox is locked
     */
    isLocked: boolean = false;
}

/**
 * Provider for the current toolbox tool
 */
export interface ToolTypeProvider {
    /**
     * The currently selected toolbox tool
     */
    readonly toolType: ToolboxToolType;
}
