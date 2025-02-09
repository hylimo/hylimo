import { ConnectionEditEntry, Toolbox } from "../toolbox.js";
import { VNode, h } from "snabbdom";
import { generatePreviewIfAvailable } from "./preview.js";
import { Root } from "@hylimo/diagram-common";
import { generateSearchBox } from "./search.js";

/**
 * Generates the toolbox UI for the connection operator.
 *
 * @param context The toolbox context
 * @param root The current root element
 * @returns The toolbox UI for the connection operator
 */
export function generateToolboxConnectDetails(context: Toolbox, root: Root): VNode[] {
    return [generateSearchBox(context), h("div.items", generateConnectionToolboxItems(context, root))];
}

/**
 * Generates the UI for the connection operator toolbox items.
 *
 * @param context The toolbox context
 * @param root The root element providing the connection operator edits
 * @returns The UI for the connection operator toolbox items
 */
function generateConnectionToolboxItems(context: Toolbox, root: Root): VNode {
    const connections = context.getConnectionEdits(root);
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
            on: {
                click: (event) => {
                    context.selectedConnection = connectionEdit.name;
                    context.searchString = "";
                    event.stopPropagation();
                    context.update();
                },
                mouseenter: () => {
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
 * Generates the connection icon.
 *
 * @returns The connection icon
 */
export function generateConnectionIcon(): VNode {
    return h(
        "svg",
        {
            attrs: {
                viewBox: "0 0 16 16"
            },
            class: {
                "connection-icon": true
            }
        },
        [h("path", { attrs: { d: "M 2 13 H 7 V 5 H 14 m -3 -3 l 3 3 l -3 3" } })]
    );
}
