import { inject, injectable } from "inversify";
import {
    AbstractUIExtension,
    IActionDispatcher,
    IActionHandler,
    ICommand,
    IModelFactory,
    ModelRenderer,
    ModelRendererFactory,
    PatcherProvider,
    TYPES as SPROTTY_TYPES
} from "sprotty";
import { Action, generateRequestId, SetModelAction, UpdateModelAction } from "sprotty-protocol";
import { VNode, h } from "snabbdom";
import { Root } from "@hylimo/diagram-common";
import { TransactionalMoveAction } from "../move/transactionalMoveAction.js";
import {
    ConnectionEdit,
    EditorConfigUpdatedAction,
    ToolboxEdit,
    ToolboxEditPredictionRequestAction,
    TransactionalAction
} from "@hylimo/diagram-protocol";
import { TYPES } from "../types.js";
import { ConfigManager } from "../config/configManager.js";
import MiniSearch, { SearchResult } from "minisearch";
import { CreateElementMoveHandler } from "./createElementMoveHandler.js";
import { ConnectionEditProvider } from "./connectionEditProvider.js";

/**
 * UI Extension which displays the graphical toolbox.
 * Supports
 * - creating elements by dragging them from the toolbox or clicking them
 * - searching for elements
 * - showing previews for elements
 * - selecting the connection operator used for creating connections
 */
@injectable()
export class Toolbox extends AbstractUIExtension implements IActionHandler, ConnectionEditProvider {
    /**
     * The unique identifier of the toolbox.
     */
    static readonly ID = "toolbox";

    /**
     * If available, the current snabbdom root.
     */
    private currentVNode?: VNode;

    /**
     * The current root element.
     */
    private currentRoot?: Root;

    /**
     * If true, pointer events are disabled
     */
    private pointerEventsDisabled: boolean = false;

    /**
     * If true, the toolbox is open.
     */
    private isOpen: boolean;

    /**
     * The edit for which to show a preview.
     * If undefined, no preview is shown.
     */
    private showPreviewFor?: string;

    /**
     * The search string.
     * If set, the search box is shown.
     * If set to a non-empty string, the search is active.
     */
    private searchString?: string;

    /**
     * The selected connection.
     */
    private selectedConnection?: string;

    /**
     * The search string for the connection select.
     */
    private connectionSearchString?: string;

    /**
     * The search index.
     */
    private searchIndex?: MiniSearch<ToolboxEditEntry>;

    /**
     * The connection search index.
     */
    private connectionSearchIndex?: MiniSearch<ConnectionEditEntry>;

    /**
     * Cached rendered element previews.
     */
    private elementPreviews: Map<string, VNode | undefined> = new Map();

    /**
     * The model renderer.
     */
    private readonly renderer: ModelRenderer;

    /**
     * The patcher provider.
     */
    @inject(SPROTTY_TYPES.PatcherProvider) private readonly patcherProvider!: PatcherProvider;

    /**
     * The action dispatcher.
     */
    @inject(SPROTTY_TYPES.IActionDispatcher) private readonly actionDispatcher!: IActionDispatcher;

    /**
     * The model factory, used to render previews.
     */
    @inject(SPROTTY_TYPES.IModelFactory) private readonly modelFactory!: IModelFactory;

    /**
     * Creates a new toolbox.
     *
     * @param configManager The config manager
     * @param modelRendererFactory The model renderer factory, used to obtain the model renderer
     */
    constructor(
        @inject(TYPES.ConfigManager) private readonly configManager: ConfigManager,
        @inject(SPROTTY_TYPES.ModelRendererFactory) modelRendererFactory: ModelRendererFactory
    ) {
        super();
        this.isOpen = configManager.config?.toolboxEnabled ?? true;
        this.renderer = modelRendererFactory("popup", []);
    }

    handle(action: Action): ICommand | Action | void {
        if (action.kind === UpdateModelAction.KIND || action.kind === SetModelAction.KIND) {
            if ((action as UpdateModelAction | SetModelAction).newRoot?.type === Root.TYPE) {
                const root = (action as UpdateModelAction | SetModelAction).newRoot as Root;
                this.currentRoot = root;
                this.initializeToolbox();
                this.elementPreviews.clear();
                this.searchIndex = undefined;
                this.connectionSearchIndex = undefined;
            }
        } else if (TransactionalAction.isTransactionalAction(action)) {
            if (action.committed) {
                this.pointerEventsDisabled = false;
                this.update();
            }
        } else if (EditorConfigUpdatedAction.is(action)) {
            this.isOpen = action.config.toolboxEnabled;
            this.update();
        }
    }

    /**
     * Initializes the toolbox.
     */
    private initializeToolbox(): void {
        if (!this.containerElement) {
            this.initialize();
        }
        this.update();
    }

    /**
     * Updates the toolbox by re-rendering it.
     */
    private update(): void {
        if (this.currentRoot != undefined) {
            this.currentVNode = this.patcherProvider.patcher(
                this.currentVNode!,
                this.generateToolbox(this.currentRoot)
            );
        }
    }

    override id(): string {
        return Toolbox.ID;
    }

    override containerClass(): string {
        return "toolbox-wrapper";
    }

    protected override initializeContents(containerElement: HTMLElement): void {
        const toolbox = document.createElement("div");
        containerElement.appendChild(toolbox);
        containerElement.classList.add("hylimo");
        this.currentVNode = this.patcherProvider.patcher(toolbox, h("div"));
    }

    /**
     * Generates the toolbox UI.
     *
     * @param root The current root element
     * @returns The toolbox UI
     */
    private generateToolbox(root: Root): VNode {
        return h(
            "div.toolbox",
            {
                class: {
                    "pointer-events-disabled": this.pointerEventsDisabled,
                    closed: !this.isOpen
                }
            },
            [
                h("div.toolbox-header", [h("span.title", "Toolbox"), ...this.generateToolboxButtons()]),
                h("div.toolbox-header-content", [this.generateConnectionSearchBox(), this.generateSearchBox()]),
                h("div.items", this.generateToolboxItems(root))
            ]
        );
    }

    /**
     * Generates the toolbox buttons.
     *
     * @returns The toolbox buttons
     */
    private generateToolboxButtons(): VNode[] {
        const buttons: VNode[] = [];
        if (this.isOpen) {
            buttons.push(
                this.generateCodiconButton(
                    "search",
                    "Search",
                    () => {
                        this.searchString = this.searchString != undefined ? undefined : "";
                        this.update();
                    },
                    this.searchString != undefined
                )
            );
            buttons.push(this.generateCodiconButton("chrome-close", "Close Toolbox", () => this.toggleToolbox()));
        } else {
            buttons.push(this.generateCodiconButton("tools", "Open Toolbox", () => this.toggleToolbox()));
        }
        return buttons;
    }

    /**
     * Generates the search box.
     * If the search string is undefined or if the toolbox is closed, no search box is generated.
     *
     * @returns The search box or undefined
     */
    private generateSearchBox(): VNode | undefined {
        if (this.searchString == undefined) {
            return undefined;
        }
        const searchInput = this.generateSearchInput();
        const icon = this.generateCodicon("search", "");
        const closeButton = this.generateCodiconButton("close", "", () => {
            this.searchString = undefined;
            this.update();
        });
        return h("div.input-container", [h("div.selectable-input", [icon, searchInput, closeButton])]);
    }

    /**
     * Generates the search input element.
     *
     * @returns The search input element
     */
    private generateSearchInput() {
        return h("input", {
            props: {
                placeholder: "Search"
            },
            hook: {
                insert: (vnode) => {
                    const element = vnode.elm as HTMLInputElement;
                    element.focus();
                }
            },
            on: {
                input: (event) => {
                    this.searchString = (event.target as HTMLInputElement).value;
                    this.update();
                },
                keydown: (event) => {
                    if (event.key === "Escape") {
                        this.searchString = undefined;
                        this.update();
                    }
                }
            }
        });
    }

    /**
     * Toggles the toolbox.
     */
    private toggleToolbox(): void {
        this.isOpen = !this.isOpen;
        this.update();
        this.configManager.updateConfig({ toolboxEnabled: this.isOpen });
    }

    /**
     * Generates a codicon button.
     *
     * @param icon the name of the codicon
     * @param title the title of the button
     * @param action the action to execute when the button is clicked
     * @param active if true, the active class is added
     * @returns the codicon button
     */
    private generateCodiconButton(icon: string, title: string, action: () => void, active: boolean = false): VNode {
        return h(
            "button.codicon-button",
            {
                on: {
                    click: action
                },
                class: {
                    active
                }
            },
            [this.generateCodicon(icon, title)]
        );
    }

    /**
     * Generates a codicon.
     *
     * @param icon the name of the codicon
     * @param title the title of the codicon
     * @returns the codicon
     */
    private generateCodicon(icon: string, title: string): VNode {
        return h("i.codicon", {
            attrs: {
                title
            },
            class: {
                [`codicon-${icon}`]: true
            }
        });
    }

    /**
     * Generates the UI for the toolbox items.
     *
     * @param root The root element providing the toolbox edits
     * @returns The UI for the toolbox items
     */
    private generateToolboxItems(root: Root): (VNode | undefined)[] | VNode {
        if (this.connectionSearchString != undefined) {
            return this.generateConnectionToolboxItems();
        } else if (this.searchString != undefined && this.searchString.length > 0) {
            return this.generateFilteredToolboxItems(this.searchString);
        } else {
            return this.generateGroupedToolboxItems(root);
        }
    }

    /**
     * Generates the UI for the toolbox items grouped by group.
     * Used if no search is active.
     *
     * @param root The root element providing the toolbox edits
     * @returns The UI for the toolbox items
     */
    private generateGroupedToolboxItems(root: Root): VNode[] {
        const aggregatedEdits = new Map<string, ToolboxEditEntry[]>();
        for (const toolboxEdit of this.getToolboxEdits(root)) {
            const key = toolboxEdit.group;
            if (!aggregatedEdits.has(key)) {
                aggregatedEdits.set(key, []);
            }
            aggregatedEdits.get(key)?.push(toolboxEdit);
        }
        return [...aggregatedEdits.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([group, toolboxEdits]) => this.generateToolboxItemGroup(group, toolboxEdits));
    }

    /**
     * Generates the UI for the toolbox items filtered by a search string.
     *
     * @param filter The search string
     * @returns The UI for the toolbox items
     */
    private generateFilteredToolboxItems(filter: string): VNode {
        const searchIndex = this.getSearchIndex();
        const results = searchIndex.search(filter);
        return h("div.group", [
            ...results.map((toolboxEdit) => this.generateToolboxItem(toolboxEdit as ToolboxEditEntry & SearchResult))
        ]);
    }

    /**
     * Generates the UI for the connection operator search box.
     *
     * @returns The UI for the connection operator search box
     */
    private generateConnectionSearchBox(): VNode | undefined {
        const connections = this.getConnectionEdits(this.currentRoot!);
        if (connections.length === 0) {
            return undefined;
        }
        const currentConnection = this.getCurrentConnection(connections);
        const input = h(
            "div.selectable-input",
            {
                on: {
                    click: (event, vnode) => {
                        this.connectionSearchString = "";
                        this.searchString = undefined;
                        (vnode.elm as HTMLDivElement).querySelector("input")?.focus();
                        this.update();
                    },
                    focusout: () => {
                        this.connectionSearchString = undefined;
                        this.update();
                    },
                    mousedown: (event) => {
                        if (!(event.target instanceof HTMLInputElement)) {
                            event.preventDefault();
                        }
                    }
                }
            },
            [this.generateConnectionIcon(), this.generateConnectionSearchInput(currentConnection)]
        );
        return h("div.input-container", [input]);
    }

    /**
     * Generates the connection search input element
     *
     * @param currentConnection the currently selected connection operator
     * @returns The search input element
     */
    private generateConnectionSearchInput(currentConnection: string): VNode {
        return h("input", {
            attrs: {
                value: currentConnection
            },
            on: {
                input: (event) => {
                    this.connectionSearchString = (event.target as HTMLInputElement).value;
                    this.update();
                },
                keydown: (event) => {
                    if (event.key === "Escape") {
                        this.connectionSearchString = undefined;
                        this.update();
                    }
                }
            },
            hook: {
                update: (oldVnode, vnode) => {
                    if (this.connectionSearchString == undefined) {
                        (vnode.elm as HTMLInputElement).value = currentConnection;
                    }
                }
            }
        });
    }

    /**
     * Generates the UI for the connection operator toolbox items.
     *
     * @returns The UI for the connection operator toolbox items
     */
    private generateConnectionToolboxItems(): VNode {
        const connections = this.getConnectionEdits(this.currentRoot!);
        const filteredConnections = this.getFilteredConnections(connections);
        const selectedConnection = this.getCurrentConnection(connections);
        return h("div.group", [
            ...filteredConnections.map((connection) =>
                this.generateConnectionToolboxItem(connection, connection.name === selectedConnection)
            )
        ]);
    }

    /**
     * Gets the filtered connection operators.
     *
     * @param connections The available connection operators
     * @returns The filtered connection operators
     */
    private getFilteredConnections(connections: ConnectionEditEntry[]): ConnectionEditEntry[] {
        let filteredConnections: ConnectionEditEntry[] = connections;
        if (this.connectionSearchString != undefined && this.connectionSearchString.length > 0) {
            const searchIndex = this.getConnectionSearchIndex();
            const results = searchIndex.search(this.connectionSearchString);
            filteredConnections = results.map((result) => result.edit);
            const indexBasedConnections = new Set(filteredConnections);
            for (const connection of connections) {
                if (!indexBasedConnections.has(connection) && connection.name.includes(this.connectionSearchString)) {
                    filteredConnections.push(connection);
                }
            }
        }
        return filteredConnections;
    }

    /**
     * Generates an toolbox item for a connection
     *
     * @param connectionEdit the connection edit to generate the item for
     * @param selected if true, the item is selected
     * @param focused if true, the item is focused
     * @returns the generated item
     */
    private generateConnectionToolboxItem(connectionEdit: ConnectionEditEntry, selected: boolean): VNode {
        return h(
            "button.item",
            {
                on: {
                    click: (event) => {
                        this.selectedConnection = connectionEdit.name;
                        this.connectionSearchString = undefined;
                        event.stopPropagation();
                        this.update();
                    },
                    mouseenter: () => {
                        this.showPreview(connectionEdit);
                    },
                    mouseleave: () => {
                        this.showPreviewFor = undefined;
                    },
                    mousedown: (event) => {
                        event.preventDefault();
                    }
                },
                class: {
                    selected
                }
            },
            [connectionEdit.name, this.generatePreviewIfAvailable(connectionEdit)]
        );
    }

    /**
     * Gets the current connection operator
     * Uses {@link selectedConnection} if it is set and in the list of available connections
     *
     * @param connections the list of available connection operators
     * @returns the current connection operator
     */
    private getCurrentConnection(connections: ConnectionEditEntry[]): string {
        if (
            this.selectedConnection != undefined &&
            connections.some((entry) => entry.name === this.selectedConnection)
        ) {
            return this.selectedConnection;
        }
        return connections[0].name;
    }

    /**
     * Generates the connection icon.
     *
     * @returns The connection icon
     */
    private generateConnectionIcon(): VNode {
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

    /**
     * Gets the current connection edit
     *
     * @returns the current connection edit or undefined if no connection edit is available
     */
    getConnectionEdit(): `connection/${string}` | undefined {
        if (this.currentRoot == undefined) {
            return undefined;
        }
        const connections = this.getConnectionEdits(this.currentRoot);
        if (connections.length === 0) {
            return undefined;
        }
        return `connection/${this.getCurrentConnection(connections)}`;
    }

    /**
     * Generates the UI for a toolbox item group.
     *
     * @param group The group name
     * @param toolboxEdits The toolbox edits in the group
     * @returns The UI for the toolbox item group
     */
    private generateToolboxItemGroup(group: string, toolboxEdits: ToolboxEditEntry[]): VNode {
        return h("div.group", [
            h("div.group-header", group),
            ...toolboxEdits.map((toolboxEdit) => this.generateToolboxItem(toolboxEdit))
        ]);
    }

    /**
     * Generates the UI for a toolbox edit.
     *
     * @param toolboxEdit The toolbox edit to generate the UI for
     * @returns The UI for the toolbox edit
     */
    private generateToolboxItem(toolboxEdit: ToolboxEditEntry): VNode {
        return h(
            "button.item",
            {
                on: {
                    mousedown: (event) => {
                        const action: TransactionalMoveAction = {
                            kind: TransactionalMoveAction.KIND,
                            handlerProvider: (root) => new CreateElementMoveHandler(toolboxEdit.edit, root),
                            maxUpdatesPerRevision: 1
                        };
                        this.pointerEventsDisabled = true;
                        event.preventDefault();
                        this.update();
                        this.actionDispatcher.dispatch(action);
                    },
                    mouseenter: () => {
                        this.showPreview(toolboxEdit);
                    },
                    mouseleave: () => {
                        this.showPreviewFor = undefined;
                    }
                }
            },
            [toolboxEdit.name, this.generatePreviewIfAvailable(toolboxEdit)]
        );
    }

    /**
     * Generates the preview for a toolbox/connection edit if available.
     * If no preview is available, undefined is returned.
     *
     * @param editEntry The toolbox/connection edit
     * @returns The preview or undefined
     */
    private generatePreviewIfAvailable(editEntry: ToolboxEditEntry | ConnectionEditEntry): VNode | undefined {
        if (this.showPreviewFor != editEntry.edit) {
            return undefined;
        }
        const preview = this.elementPreviews.get(editEntry.edit);
        if (preview == undefined) {
            return undefined;
        }
        return h(
            "div.preview",
            {
                hook: {
                    insert: (vnode) => {
                        const element = vnode.elm as HTMLElement;
                        const parent = element.parentElement!;
                        const toolbox = parent.closest(".toolbox")!;
                        const offset = parent.getBoundingClientRect().top - toolbox.getBoundingClientRect().top;
                        element.style.top = `${offset}px`;
                    }
                }
            },
            preview
        );
    }

    /**
     * Extracts the toolbox edits from the root element.
     *
     * @param root The root element
     * @returns The toolbox edits
     */
    private getToolboxEdits(root: Root): ToolboxEditEntry[] {
        return Object.keys(root.edits)
            .filter((key) => key.startsWith("toolbox/"))
            .map((key) => {
                const [group, name] = key.substring("toolbox/".length).split("/");
                return { group, name, edit: key as `toolbox/${string}` };
            });
    }

    /**
     * Extracts the connection edits from the root element.
     *
     * @param root The root element
     * @returns The connection edits
     */
    private getConnectionEdits(root: Root): ConnectionEditEntry[] {
        return Object.keys(root.edits)
            .filter((key) => key.startsWith("connection/"))
            .map((key) => ({ name: key.substring("connection/".length), edit: key as `connection/${string}` }));
    }

    /**
     * Shows a preview for a toolbox edit.
     * If no preview is available, a prediction is requested.
     *
     * @param edit The toolbox edit to show a preview for
     */
    private showPreview(edit: ToolboxEditEntry | ConnectionEditEntry): void {
        this.showPreviewFor = edit.edit;
        if (!this.elementPreviews.has(edit.edit)) {
            this.requestPrediction(this.generatePredictionEdit(edit), edit.edit);
        } else {
            this.update();
        }
    }

    /**
     * Creates a prediction edit for a toolbox/connection edit entry.
     *
     * @param edit The toolbox edit to generate a prediction for
     * @returns The prediction edit
     */
    private generatePredictionEdit(edit: ToolboxEditEntry | ConnectionEditEntry): ToolboxEdit | ConnectionEdit {
        if (edit.edit.startsWith("toolbox/")) {
            return {
                types: [edit.edit as `toolbox/${string}`],
                values: {
                    x: 0,
                    y: 0,
                    prediction: true
                },
                elements: [this.currentRoot!.id]
            };
        } else {
            return {
                types: [edit.edit as `connection/${string}`],
                values: {
                    start: {
                        x: 0,
                        y: 0
                    },
                    end: {
                        x: 200,
                        y: 0
                    },
                    prediction: true
                },
                elements: [this.currentRoot!.id]
            };
        }
    }

    /**
     * Requests a prediction for a toolbox edit.
     *
     * @param edit The toolbox edit to request a prediction for
     * @param key The key under which the prediction is stored
     */
    private async requestPrediction(edit: ToolboxEdit | ConnectionEdit, key: string): Promise<void> {
        const request: ToolboxEditPredictionRequestAction = {
            kind: ToolboxEditPredictionRequestAction.KIND,
            edit,
            requestId: generateRequestId()
        };
        const result = await this.actionDispatcher.request(request);
        let preview: VNode | undefined = undefined;
        const size = result.root?.rootBounds?.size;
        if (result.root != undefined && size?.height && size?.width) {
            const model = this.modelFactory.createRoot(result.root);
            preview = this.renderer.renderElement(model);
        }
        this.elementPreviews.set(key, preview);
        this.update();
    }

    /**
     * Returns the search index.
     * If the search index is not yet available, it is created.
     *
     * @returns The search index
     */
    private getSearchIndex(): MiniSearch<ToolboxEditEntry> {
        if (this.searchIndex == undefined) {
            this.searchIndex = new MiniSearch({
                fields: ["name", "group"],
                storeFields: ["name", "group", "edit"],
                searchOptions: {
                    prefix: true,
                    fuzzy: 0.2,
                    boost: { name: 2 }
                }
            });
            this.searchIndex.addAll(
                this.getToolboxEdits(this.currentRoot!).map((edit) => ({ ...edit, id: edit.edit }))
            );
        }
        return this.searchIndex;
    }

    /**
     * Returns the connection search index.
     * If the connection search index is not yet available, it is created.
     *
     * @returns The connection search index
     */
    private getConnectionSearchIndex(): MiniSearch<ConnectionEditEntry> {
        if (this.connectionSearchIndex == undefined) {
            this.connectionSearchIndex = new MiniSearch({
                fields: ["edit"],
                storeFields: ["edit"],
                searchOptions: {
                    prefix: true,
                    fuzzy: 0.2
                },
                tokenize: (string) => string.split(" ")
            });
            this.connectionSearchIndex.addAll(
                this.getConnectionEdits(this.currentRoot!).map((edit) => ({ ...edit, id: edit }))
            );
        }
        return this.connectionSearchIndex;
    }
}

/**
 * A toolbox edit entry
 */
interface ToolboxEditEntry {
    /**
     * The group of the toolbox item
     */
    group: string;
    /**
     * The name of the toolbox item
     */
    name: string;
    /**
     * The full key of the edit
     */
    edit: `toolbox/${string}`;
}

/**
 * A connection edit entry
 */
interface ConnectionEditEntry {
    /**
     * The name of the connection operator
     */
    name: string;
    /**
     * The full key of the edit
     */
    edit: `connection/${string}`;
}
