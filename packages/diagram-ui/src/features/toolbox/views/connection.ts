import type { ConnectionEditEntry, Toolbox } from "../toolbox.js";
import type { VNode } from "snabbdom";
import { h } from "snabbdom";
import { generatePreviewIfAvailable } from "./preview.js";
import { generateIcon } from "./icon.js";
import { ArrowUpRight } from "lucide";

/**
 * Generates the toolbox UI for the connection operator.
 *
 * @param context The toolbox context
 * @returns The toolbox UI for the connection operator
 */
export function generateToolboxConnectDetails(context: Toolbox): VNode[] {
    const res = [generateSearchBox(context)];
    if (context.connectionSearchString != undefined) {
        res.push(h("div.items", generateConnectionToolboxItems(context)));
    }
    return res;
}

/**
 * Generates the UI for the connection operator toolbox items.
 *
 * @param context The toolbox context
 * @returns The UI for the connection operator toolbox items
 */
function generateConnectionToolboxItems(context: Toolbox): VNode {
    const connections = context.getConnectionEdits();
    const filteredConnections = getFilteredConnections(context, connections);
    const selectedConnection = context.getCurrentConnection(connections);
    return h("div.group", [
        ...filteredConnections.map((connection) =>
            generateConnectionToolboxItem(context, connection, connection.name === selectedConnection)
        )
    ]);
}

/**
 * Gets the filtered connection operators.
 *
 * @param context The toolbox context
 * @param connections The available connection operators
 * @returns The filtered connection operators
 */
export function getFilteredConnections(context: Toolbox, connections: ConnectionEditEntry[]): ConnectionEditEntry[] {
    let filteredConnections: ConnectionEditEntry[] = connections;
    if (context.searchString.length > 0) {
        const searchIndex = context.getConnectionSearchIndex();
        const results = searchIndex.search(context.searchString);
        filteredConnections = results.map((result) => result.edit);
        const indexBasedConnections = new Set(filteredConnections);
        for (const connection of connections) {
            if (!indexBasedConnections.has(connection) && connection.name.includes(context.searchString)) {
                filteredConnections.push(connection);
            }
        }
    }
    return filteredConnections;
}

/**
 * Generates an toolbox item for a connection
 *
 * @param context the toolbox context
 * @param connectionEdit the connection edit to generate the item for
 * @param selected if true, the item is selected
 * @returns the generated item
 */
export function generateConnectionToolboxItem(
    context: Toolbox,
    connectionEdit: ConnectionEditEntry,
    selected: boolean
): VNode {
    return h(
        "button.item",
        {
            attrs: {
                disabled: !context.isValid
            },
            on: {
                click: (event) => {
                    if (!context.isValid) {
                        return;
                    }
                    context.selectedConnection = connectionEdit.name;
                    context.connectionSearchString = undefined;
                    event.stopPropagation();
                    context.update();
                },
                mouseenter: () => {
                    if (!context.isValid) {
                        return;
                    }
                    context.showPreview(connectionEdit);
                },
                mouseleave: () => {
                    context.showPreviewFor = undefined;
                },
                mousedown: (event) => {
                    event.preventDefault();
                }
            },
            class: {
                selected
            }
        },
        [connectionEdit.name, generatePreviewIfAvailable(context, connectionEdit)]
    );
}

/**
 * Generates the UI for the connection operator search box.
 *
 * @param context The toolbox context
 * @returns The UI for the connection operator search box
 */
function generateSearchBox(context: Toolbox): VNode {
    const connections = context.getConnectionEdits();
    const currentConnection = context.getCurrentConnection(connections) ?? "";
    const input = h(
        "div.selectable-input",
        {
            on: {
                click: (event, vnode) => {
                    context.connectionSearchString = "";
                    (vnode.elm as HTMLDivElement).querySelector("input")?.focus();
                    context.update();
                },
                focusout: () => {
                    context.connectionSearchString = undefined;
                    context.update();
                },
                mousedown: (event) => {
                    if (!(event.target instanceof HTMLInputElement)) {
                        event.preventDefault();
                    }
                }
            }
        },
        [generateIcon(ArrowUpRight), generateSearchInput(context, currentConnection)]
    );
    return h("div.toolbox-details-header", [input]);
}

/**
 * Generates the connection search input element
 *
 * @param context The toolbox context
 * @param currentConnection the currently selected connection operator
 * @returns The search input element
 */
function generateSearchInput(context: Toolbox, currentConnection: string): VNode {
    return h("input", {
        attrs: {
            value: currentConnection
        },
        on: {
            input: (event) => {
                context.connectionSearchString = (event.target as HTMLInputElement).value;
                context.update();
            },
            keydown: (event) => {
                if (event.key === "Escape") {
                    context.connectionSearchString = undefined;
                    context.update();
                }
            }
        },
        hook: {
            update: (oldVnode, vnode) => {
                if (context.connectionSearchString == undefined) {
                    (vnode.elm as HTMLInputElement).value = currentConnection;
                }
            }
        }
    });
}
