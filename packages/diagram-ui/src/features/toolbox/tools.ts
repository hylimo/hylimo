import { Toolbox } from "./toolbox.js";
import { ArrowUpRight, FolderPlus, Hand, IconNode, MousePointer, SquareDashedMousePointer, WandSparkles } from "lucide";

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
    icon: IconNode;
    title: string;
    action: (context: Toolbox) => void;
}

export const toolboxTools: ToolboxTool[] = [
    {
        id: ToolboxToolType.HAND,
        icon: Hand,
        title: "Hand (panning)",
        action: (context) => enableTool(context, ToolboxToolType.HAND)
    },
    {
        id: ToolboxToolType.CURSOR,
        icon: MousePointer,
        title: "Default (selection)",
        action: (context) => enableTool(context, ToolboxToolType.CURSOR)
    },
    {
        id: ToolboxToolType.ADD_ELEMENT,
        icon: FolderPlus,
        title: "Add Element",
        action: (context) => enableOrLockTool(context, ToolboxToolType.ADD_ELEMENT)
    },
    {
        id: ToolboxToolType.CONNECT,
        icon: ArrowUpRight,
        title: "Connect",
        action: (context) => enableOrLockTool(context, ToolboxToolType.CONNECT)
    },
    {
        id: ToolboxToolType.BOX_SELECT,
        icon: SquareDashedMousePointer,
        title: "Box Select",
        action: (context) => enableTool(context, ToolboxToolType.BOX_SELECT)
    },
    {
        id: ToolboxToolType.AUTOLAYOUT,
        icon: WandSparkles,
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
