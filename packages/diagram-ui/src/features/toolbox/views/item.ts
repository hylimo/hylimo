import type { VNode } from "snabbdom";
import { h } from "snabbdom";
import type { Toolbox, ToolboxEditEntry } from "../toolbox.js";
import type { SearchResult } from "minisearch";
import { TransactionalMoveAction } from "../../move/transactionalMoveAction.js";
import { CreateElementMoveHandler } from "../createElementMoveHandler.js";
import { generatePreviewIfAvailable } from "./preview.js";
import { generateIcon } from "./icon.js";
import { Search } from "lucide";
import { ToolboxToolType } from "../toolType.js";
import { TransactionalAction, type ToolboxEdit } from "@hylimo/diagram-protocol";

/**
 * Generates the UI for the toolbox items.
 *
 * @param context The toolbox context
 * @returns The UI for the toolbox items
 */
export function generateToolboxAddElementDetails(context: Toolbox): VNode[] {
    if (context.getToolboxEdits().length === 0) {
        return [];
    }
    return [
        generateSearchBox(context),
        h(
            "div.items",
            context.searchString.length > 0
                ? generateFilteredToolboxItems(context, context.searchString)
                : generateGroupedToolboxItems(context)
        )
    ];
}

/**
 * Generates the UI for the toolbox items grouped by group.
 * Used if no search is active.
 *
 * @param context The toolbox context
 * @returns The UI for the toolbox items
 */
function generateGroupedToolboxItems(context: Toolbox): VNode[] {
    const aggregatedEdits = new Map<string, ToolboxEditEntry[]>();
    for (const toolboxEdit of context.getToolboxEdits()) {
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
                    if (toolboxEdit.canMove) {
                        handleMoveAction(context, toolboxEdit, event);
                    } else {
                        handleCreateAction(context, toolboxEdit, event);
                    }
                },
                pointerup: () => {
                    if (!toolboxEdit.canMove && !context.toolState.isLocked) {
                        context.updateTool(ToolboxToolType.CURSOR, false);
                    }
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

/**
 * Handles the move action when a toolbox item is clicked and can be moved.
 *
 * @param context The toolbox context
 * @param toolboxEdit The toolbox edit entry
 * @param event The pointer event
 */
function handleMoveAction(context: Toolbox, toolboxEdit: ToolboxEditEntry, event: PointerEvent): void {
    const action: TransactionalMoveAction = {
        kind: TransactionalMoveAction.KIND,
        handlerProvider: (root) =>
            new CreateElementMoveHandler(
                toolboxEdit.edit,
                root,
                toolboxEdit.target,
                event.pointerId,
                context.settingsProvider.settings,
                context.configManager.config?.snappingEnabled ?? true
            ),
        maxUpdatesPerRevision: 1
    };
    if (!context.toolState.isLocked) {
        context.updateTool(ToolboxToolType.CURSOR, false);
    }
    context.pointerEventsDisabled = true;
    context.update();
    context.actionDispatcher.dispatch(action);
}

/**
 * Handles the create action when a toolbox item is clicked and cannot be moved.
 *
 * @param context The toolbox context
 * @param toolboxEdit The toolbox edit entry
 * @param event The pointer event
 */
function handleCreateAction(context: Toolbox, toolboxEdit: ToolboxEditEntry, event: PointerEvent): void {
    const edit: ToolboxEdit = {
        types: [toolboxEdit.edit],
        values: {
            x: 0,
            y: 0,
            expression: toolboxEdit.target.editExpression
        },
        elements: [toolboxEdit.target.id]
    };
    const action: TransactionalAction = {
        kind: TransactionalAction.KIND,
        sequenceNumber: 0,
        committed: true,
        transactionId: context.transactionIdProvider.generateId(),
        edits: [edit]
    };
    if (!context.toolState.isLocked) {
        (event.target as HTMLElement | undefined)?.setPointerCapture(event.pointerId);
    }
    context.actionDispatcher.dispatch(action);
}
