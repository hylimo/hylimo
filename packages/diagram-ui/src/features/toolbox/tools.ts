import type { Toolbox } from "./toolbox.js";
import type { IconNode } from "lucide";
import { ArrowUpRight, FolderPlus, Hand, MousePointer, SquareDashedMousePointer, WandSparkles } from "lucide";
import { ToolboxToolType } from "./toolType.js";

/**
 * A tool in the toolbox.
 */
export interface ToolboxTool {
    /**
     * The tool to use
     */
    id: ToolboxToolType;
    /**
     * The icon to show
     */
    icon: IconNode;
    /**
     * An alternative text for the icon
     */
    title: string;
    /**
     * What to do when the tool is selected
     */
    action: (context: Toolbox) => void;
}

/**
 * The tools available in the toolbox.
 */
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

/**
 * Enables the given tool.
 *
 * @param context the toolbox context
 * @param tool the tool to enable
 */
function enableTool(context: Toolbox, tool: ToolboxToolType): void {
    if (context.toolState.toolType != tool) {
        context.updateTool(tool, false);
    }
}

/**
 * Enables a given tool. If it is already enabled, toggles the locked state.
 *
 * @param context the toolbox context
 * @param tool the tool to enable/lock
 */
function enableOrLockTool(context: Toolbox, tool: ToolboxToolType): void {
    if (context.toolState.toolType != tool) {
        context.updateTool(tool, false);
    } else {
        context.updateTool(tool, !context.toolState.isLocked);
    }
    context.update();
}
