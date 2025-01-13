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
    EditorConfigUpdatedAction,
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
     * If true, the connection select is open.
     */
    private connectionSelectOpen: boolean = false;

    /**
     * The search index.
     */
    private searchIndex?: MiniSearch<ToolboxEdit>;

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
        this.setContainerVisible(true);
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
                this.generateConnectionSelect(),
                this.generateSearchBox(),
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
        if (this.searchString == undefined || !this.isOpen) {
            return undefined;
        }
        const searchInput = this.generateSearchInput();
        const icon = this.generateCodicon("search", "");
        const closeButton = this.generateCodiconButton("close", "", () => {
            this.searchString = undefined;
            this.update();
        });
        return h("div.input-container", [h("div.search-box.selectable-input", [icon, searchInput, closeButton])]);
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
        if (this.searchString != undefined && this.searchString.length > 0) {
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
        const aggregatedEdits = new Map<string, ToolboxEdit[]>();
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
            ...results.map((toolboxEdit) => this.generateToolboxItem(toolboxEdit as ToolboxEdit & SearchResult))
        ]);
    }

    /**
     * Generates the connection select UI.
     * If no connections are available, undefined is returned.
     *
     * @returns the connection select UI or undefined
     */
    private generateConnectionSelect(): VNode | undefined {
        const connections = this.getConnectionEdits(this.currentRoot!);
        if (connections.length === 0) {
            return undefined;
        }
        return h("div.input-container", [this.generateConnectionSelectButton(connections)]);
    }

    /**
     * Generates the button for the connection operator select
     *
     * @param connections the list of available connection operators
     * @returns the generate select
     */
    private generateConnectionSelectButton(connections: string[]): VNode {
        const currentConnection = this.getCurrentConnection(connections);
        return h(
            "button.connections-select.selectable-input",
            {
                on: {
                    click: () => {
                        this.connectionSelectOpen = !this.connectionSelectOpen;
                        this.update();
                    },
                    focusout: (event, vnode) => {
                        const element = vnode.elm as HTMLElement;
                        if (!element.contains(event.relatedTarget as Node) && this.connectionSelectOpen) {
                            this.connectionSelectOpen = false;
                            this.update();
                        }
                    }
                }
            },
            [
                h("span", currentConnection),
                this.generateCodicon(this.connectionSelectOpen ? "chevron-up" : "chevron-down", ""),
                this.generateConnectionSelectDropdown(connections, currentConnection)
            ]
        );
    }

    /**
     * Generates the dropdown for the connection operator select
     *
     * @param connections the entries for the dropdown
     * @param currentConnection the currently selected connection operator
     * @returns the generated dropdown
     */
    private generateConnectionSelectDropdown(connections: string[], currentConnection: string): VNode | undefined {
        if (!this.connectionSelectOpen) {
            return undefined;
        }
        return h(
            "div.connections-select-dropdown",
            connections.map((connection) =>
                this.generateConnectionSelectItem(connection, currentConnection === connection)
            )
        );
    }

    /**
     * Generates an item for the connection operator select dropdown
     *
     * @param connection the connection operator to generate the item for
     * @param selected if true, the item is selected
     * @returns the generated item
     */
    private generateConnectionSelectItem(connection: string, selected: boolean): VNode {
        return h(
            "button.item",
            {
                on: {
                    click: (event) => {
                        this.selectedConnection = connection;
                        this.connectionSelectOpen = false;
                        event.stopPropagation();
                        this.update();
                    }
                },
                class: {
                    selected
                }
            },
            [h("span", connection)]
        );
    }

    /**
     * Gets the current connection operator
     * Uses {@link selectedConnection} if it is set and in the list of available connections
     *
     * @param connections the list of available connection operators
     * @returns the current connection operator
     */
    private getCurrentConnection(connections: string[]): string {
        if (this.selectedConnection != undefined && connections.includes(this.selectedConnection)) {
            return this.selectedConnection;
        }
        return connections[0];
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
    private generateToolboxItemGroup(group: string, toolboxEdits: ToolboxEdit[]): VNode {
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
    private generateToolboxItem(toolboxEdit: ToolboxEdit): VNode {
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
     * Generates the preview for a toolbox edit if available.
     * If no preview is available, undefined is returned.
     *
     * @param toolboxEdit The toolbox edit
     * @returns The preview or undefined
     */
    private generatePreviewIfAvailable(toolboxEdit: ToolboxEdit): VNode | undefined {
        if (this.showPreviewFor != toolboxEdit.edit) {
            return undefined;
        }
        const preview = this.elementPreviews.get(toolboxEdit.edit);
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
    private getToolboxEdits(root: Root): ToolboxEdit[] {
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
    private getConnectionEdits(root: Root): string[] {
        return Object.keys(root.edits)
            .filter((key) => key.startsWith("connection/"))
            .map((key) => key.substring("connection/".length));
    }

    /**
     * Shows a preview for a toolbox edit.
     * If no preview is available, a prediction is requested.
     *
     * @param edit The toolbox edit to show a preview for
     */
    private showPreview(edit: ToolboxEdit): void {
        this.showPreviewFor = edit.edit;
        if (!this.elementPreviews.has(edit.edit)) {
            this.requestPrediction(edit);
        } else {
            this.update();
        }
    }

    /**
     * Requests a prediction for a toolbox edit.
     *
     * @param edit The toolbox edit to request a prediction for
     */
    private async requestPrediction(edit: ToolboxEdit): Promise<void> {
        const request: ToolboxEditPredictionRequestAction = {
            kind: ToolboxEditPredictionRequestAction.KIND,
            edit: {
                types: [edit.edit],
                values: {
                    x: 0,
                    y: 0,
                    prediction: true
                },
                elements: [this.currentRoot!.id]
            },
            requestId: generateRequestId()
        };
        const result = await this.actionDispatcher.request(request);
        let preview: VNode | undefined = undefined;
        const size = result.root?.rootBounds?.size;
        if (result.root != undefined && size?.height && size?.width) {
            const model = this.modelFactory.createRoot(result.root);
            preview = this.renderer.renderElement(model);
        }
        this.elementPreviews.set(edit.edit, preview);
        this.update();
    }

    /**
     * Returns the search index.
     * If the search index is not yet available, it is created.
     *
     * @returns The search index
     */
    private getSearchIndex(): MiniSearch<ToolboxEdit> {
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
}

/**
 * A toolbox edit entry
 */
interface ToolboxEdit {
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
