import type { Root } from "@hylimo/diagram-common";
import type { VNode } from "snabbdom";
import { h } from "snabbdom";
import type { Toolbox, ToolboxEditEntry } from "../toolbox.js";
import type { SearchResult } from "minisearch";
import { TransactionalMoveAction } from "../../move/transactionalMoveAction.js";
import { CreateElementMoveHandler, CreateElementSnapHandler } from "../createElementMoveHandler.js";
import { generatePreviewIfAvailable } from "./preview.js";
import { generateIcon } from "./icon.js";
import { Search } from "lucide";
import { ToolboxToolType } from "../toolType.js";

/**
 * Generates the UI for the toolbox items.
 *
 * @param context The toolbox context
 * @param root The root element providing the toolbox edits
 * @returns The UI for the toolbox items
 */
export function generateToolboxAddElementDetails(context: Toolbox, root: Root): VNode[] {
    return [
        generateSearchBox(context),
        h(
            "div.items",
            context.searchString.length > 0
                ? generateFilteredToolboxItems(context, context.searchString)
                : generateGroupedToolboxItems(context, root)
        )
    ];
}

/**
 * Generates the UI for the toolbox items grouped by group.
 * Used if no search is active.
 *
 * @param context The toolbox context
 * @param root The root element providing the toolbox edits
 * @returns The UI for the toolbox items
 */
function generateGroupedToolboxItems(context: Toolbox, root: Root): VNode[] {
    const aggregatedEdits = new Map<string, ToolboxEditEntry[]>();
    for (const toolboxEdit of context.getToolboxEdits(root)) {
        const key = toolboxEdit.group;
        if (!aggregatedEdits.has(key)) {
            aggregatedEdits.set(key, []);
        }
        aggregatedEdits.get(key)?.push(toolboxEdit);
    }
    return [...aggregatedEdits.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([group, toolboxEdits]) => generateToolboxItemGroup(context, group, toolboxEdits));
}

/**
 * Generates the UI for the toolbox items filtered by a search string.
 *
 * @param context The toolbox context
 * @param filter The search string
 * @returns The UI for the toolbox items
 */
function generateFilteredToolboxItems(context: Toolbox, filter: string): VNode {
    const searchIndex = context.getSearchIndex();
    const results = searchIndex.search(filter);
    return h("div.group", [
        ...results.map((toolboxEdit) => generateToolboxItem(context, toolboxEdit as ToolboxEditEntry & SearchResult))
    ]);
}

/**
 * Generates the UI for a toolbox item group.
 *
 * @param context The toolbox context
 * @param group The group name
 * @param toolboxEdits The toolbox edits in the group
 * @returns The UI for the toolbox item group
 */
function generateToolboxItemGroup(context: Toolbox, group: string, toolboxEdits: ToolboxEditEntry[]): VNode {
    return h("div.group", [
        h("div.group-header", group),
        ...toolboxEdits.map((toolboxEdit) => generateToolboxItem(context, toolboxEdit))
    ]);
}

/**
 * Generates the UI for a toolbox edit.
 *
 * @param context The toolbox context
 * @param toolboxEdit The toolbox edit to generate the UI for
 * @returns The UI for the toolbox edit
 */
function generateToolboxItem(context: Toolbox, toolboxEdit: ToolboxEditEntry): VNode {
    return h(
        "button.item",
        {
            on: {
                pointerdown: (event) => {
                    const action: TransactionalMoveAction = {
                        kind: TransactionalMoveAction.KIND,
                        handlerProvider: (root) =>
                            new CreateElementMoveHandler(
                                toolboxEdit.edit,
                                root,
                                event.pointerId,
                                context.configManager.config?.snappingEnabled == true
                                    ? new CreateElementSnapHandler(root)
                                    : undefined
                            ),
                        maxUpdatesPerRevision: 1
                    };
                    if (!context.toolState.isLocked) {
                        context.updateTool(ToolboxToolType.CURSOR, false);
                    }
                    context.pointerEventsDisabled = true;
                    context.update();
                    context.actionDispatcher.dispatch(action);
                },
                mouseenter: () => {
                    context.showPreview(toolboxEdit);
                },
                mouseleave: () => {
                    context.showPreviewFor = undefined;
                }
            }
        },
        [toolboxEdit.name, generatePreviewIfAvailable(context, toolboxEdit)]
    );
}

/**
 * Generates the search box.
 *
 * @param context The toolbox context
 * @returns The search box or undefined
 */
export function generateSearchBox(context: Toolbox): VNode {
    const searchInput = generateSearchInput(context);
    const icon = generateIcon(Search);
    return h("div.toolbox-details-header", [h("div.selectable-input", [icon, searchInput])]);
}

/**
 * Generates the search input element.
 *
 * @param context The toolbox context
 * @returns The search input element
 */
function generateSearchInput(context: Toolbox): VNode {
    return h("input", {
        props: {
            placeholder: "Search"
        },
        hook: {
            insert: (vnode) => {
                const element = vnode.elm as HTMLInputElement;
                element.focus();
            },
            update: (oldVnode, vnode) => {
                const element = vnode.elm as HTMLInputElement;
                element.value = context.searchString;
            }
        },
        on: {
            input: (event) => {
                context.searchString = (event.target as HTMLInputElement).value;
                context.update();
            },
            keydown: (event) => {
                if (event.key === "Escape") {
                    context.searchString = "";
                    context.update();
                }
            }
        }
    });
}
