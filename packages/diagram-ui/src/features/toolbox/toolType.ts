/**
 * Different types of tools the toolbox provides.
 */
export enum ToolboxToolType {
    HAND = "hand",
    CURSOR = "cursor",
    CONNECT = "connect",
    ADD_ELEMENT = "add-element",
    BOX_SELECT = "box-select",
    AUTOLAYOUT = "autolayout"
}

/**
 * Checks if the given tool type is a regular interaction tool.
 * Regular interaction tools to not change how users interact with the canvas.
 *
 * @param toolType the tool type to check
 * @returns true if the tool is a regular interaction tool
 */
export function isRegularInteractionTool(toolType: ToolboxToolType): boolean {
    return (
        toolType === ToolboxToolType.CURSOR ||
        toolType === ToolboxToolType.ADD_ELEMENT ||
        toolType === ToolboxToolType.AUTOLAYOUT
    );
}
