import type { Toolbox } from "../toolbox.js";
import type { VNode } from "snabbdom";
import { h } from "snabbdom";
import { generateToolboxAddElementDetails } from "./item.js";
import { generateIcon } from "./icon.js";
import type { ToolboxTool } from "../tools.js";
import { toolboxTools } from "../tools.js";
import { ToolboxToolType } from "../toolType.js";
import { generateToolboxConnectDetails } from "./connection.js";
import { Lock, PencilRuler, X } from "lucide";
import { generateUpdateKeyStateActions } from "../../key-state/keyStateKeyListener.js";

/**
 * Generates the toolbox UI.
 *
 * @param context The toolbox context
 * @returns The toolbox UI
 */
export function generateToolbox(context: Toolbox): VNode {
    return h(
        "div.toolbox",
        {
            class: {
                "pointer-events-disabled": context.pointerEventsDisabled,
                closed: !context.isOpen
            },
            on: {
                keydown: (event: KeyboardEvent) => {
                    context.actionDispatcher.dispatchAll(generateUpdateKeyStateActions(event, true));
                },
                keyup: (event: KeyboardEvent) => {
                    context.actionDispatcher.dispatchAll(generateUpdateKeyStateActions(event, false));
                }
            }
        },
        [generateToolboxTools(context), generateToolboxDetails(context)]
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
 * @returns The toolbox details UI
 */
function generateToolboxDetails(context: Toolbox): VNode {
    const tool = context.toolState.toolType;
    let details: VNode[] | undefined = undefined;
    if (tool === ToolboxToolType.ADD_ELEMENT) {
        details = generateToolboxAddElementDetails(context);
    } else if (tool === ToolboxToolType.CONNECT) {
        details = generateToolboxConnectDetails(context);
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
    const active = context.toolState.toolType === tool.id;
    return h(
        "button.toolbox-tool-button",
        {
            on: {
                click: () => tool.action(context)
            },
            attrs: {
                title: tool.title,
                disabled: !context.isToolEnabled(tool.id)
            },
            class: {
                active
            }
        },
        [generateIcon(tool.icon), active && context.toolState.isLocked ? generateIcon(Lock, ["locked"]) : undefined]
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
