import { Toolbox } from "./toolbox.js";

export enum ToolboxToolType {
    HAND = "hand",
    CURSOR = "cursor",
    CONNECT = "connect",
    ADD_ELEMENT = "add-element",
    BOX_SELECT = "box-select",
    AUTOLAYOUT = "autolayout"
}

export interface ToolboxTool {
    id: ToolboxToolType;
    title: string;
    action: (context: Toolbox) => void;
}

export const toolboxTools: ToolboxTool[] = [
    {
        id: ToolboxToolType.HAND,
        title: "Hand (panning)",
        action: (context) => enableTool(context, ToolboxToolType.HAND)
    },
    {
        id: ToolboxToolType.CURSOR,
        title: "Default (selection)",
        action: (context) => enableTool(context, ToolboxToolType.CURSOR)
    },
    {
        id: ToolboxToolType.ADD_ELEMENT,
        title: "Add Element",
        action: (context) => enableOrLockTool(context, ToolboxToolType.ADD_ELEMENT)
    },
    {
        id: ToolboxToolType.CONNECT,
        title: "Connect",
        action: (context) => enableOrLockTool(context, ToolboxToolType.CONNECT)
    },
    {
        id: ToolboxToolType.BOX_SELECT,
        title: "Box Select",
        action: (context) => enableTool(context, ToolboxToolType.BOX_SELECT)
    },
    {
        id: ToolboxToolType.AUTOLAYOUT,
        title: "Auto Layout",
        action: (context) => enableTool(context, ToolboxToolType.AUTOLAYOUT)
    }
];

function enableTool(context: Toolbox, tool: ToolboxToolType): void {
    const current = context.currentTool.type;
    if (current != tool) {
        context.currentTool = { type: tool, locked: false };
        context.update();
    }
}

function enableOrLockTool(context: Toolbox, tool: ToolboxToolType): void {
    const current = context.currentTool.type;
    if (current != tool) {
        context.currentTool = { type: tool, locked: false };
    } else {
        context.currentTool.locked = !context.currentTool.locked;
    }
    context.update();
}
