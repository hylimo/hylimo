import { Root } from "@hylimo/diagram-common";
import { Toolbox } from "../toolbox.js";
import { VNode, h } from "snabbdom";
import { generateToolboxAddElementDetails } from "./item.js";
import { generateIcon } from "./icon.js";
import { ToolboxTool, toolboxTools } from "../tools.js";
import { ToolboxToolType } from "../toolType.js";
import { generateToolboxConnectDetails } from "./connection.js";
import { Lock, PencilRuler, X } from "lucide";

/**
 * Generates the toolbox UI.
 *
 * @param context The toolbox context
 * @param root The current root element
 * @returns The toolbox UI
 */
export function generateToolbox(context: Toolbox, root: Root): VNode {
    return h(
        "div.toolbox",
        {
            class: {
                "pointer-events-disabled": context.pointerEventsDisabled,
                closed: !context.isOpen
            }
        },
        [generateToolboxTools(context), generateToolboxDetails(context, root)]
    );
}

/**
 * Generates the toolbox tools UI, consisting of tool buttons for each tool.
 *
 * @param context The toolbox context
 * @returns The toolbox tools UI
 */
function generateToolboxTools(context: Toolbox): VNode {
    return h(
        "div.toolbox-tools",
        {
            class: {
                "pointer-events-disabled": context.pointerEventsDisabled,
                closed: !context.isOpen
            }
        },
        h("div.wrapper", [
            ...toolboxTools.map((tool) => generateToolboxToolButton(context, tool)),
            h("div.divider"),
            generateToggleToolboxButton(context)
        ])
    );
}

/**
 * Generates the toolbox details UI.
 * Depending on the current tool, different details are shown.
 * Might be empty.
 *
 * @param context The toolbox context
 * @param root The current root element
 * @returns The toolbox details UI
 */
function generateToolboxDetails(context: Toolbox, root: Root): VNode {
    const tool = context.toolType;
    let details: VNode[] | undefined = undefined;
    if (tool === ToolboxToolType.ADD_ELEMENT) {
        details = generateToolboxAddElementDetails(context, root);
    } else if (tool === ToolboxToolType.CONNECT) {
        details = generateToolboxConnectDetails(context, root);
    } else if (tool === ToolboxToolType.AUTOLAYOUT) {
        // TODO
    }
    return h("div.toolbox-details", details);
}

/**
 * Generates a toolbox tool button.
 *
 * @param context The toolbox context
 * @param tool The tool to generate the button for
 * @returns The toolbox tool button
 */
function generateToolboxToolButton(context: Toolbox, tool: ToolboxTool): VNode {
    const active = context.toolType === tool.id;
    return h(
        "button.toolbox-tool-button",
        {
            on: {
                click: () => tool.action(context)
            },
            attrs: {
                title: tool.title
            },
            class: {
                active
            }
        },
        [generateIcon(tool.icon), active && context.isToolLocked ? generateIcon(Lock, ["locked"]) : undefined]
    );
}

/**
 * Generates a button to toggle the toolbox.
 *
 * @param context The toolbox context
 * @returns The toggle toolbox button
 */
function generateToggleToolboxButton(context: Toolbox): VNode {
    return h(
        "button.toolbox-tool-button",
        {
            on: {
                click: () => context.toggleToolbox()
            },
            attrs: {
                title: context.isOpen ? "Close Toolbox" : "Open Toolbox"
            }
        },
        generateIcon(context.isOpen ? X : PencilRuler)
    );
}
