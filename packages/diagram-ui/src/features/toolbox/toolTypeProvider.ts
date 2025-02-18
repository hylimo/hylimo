import { ToolboxToolType } from "./toolType.js";

/**
 * Provider for the current toolbox tool
 */
export interface ToolTypeProvider {
    /**
     * The currently selected toolbox tool
     */
    readonly toolType: ToolboxToolType;
}
