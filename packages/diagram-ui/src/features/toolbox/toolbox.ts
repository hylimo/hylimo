import { inject, injectable } from "inversify";
import type {
    IActionDispatcher,
    IActionHandler,
    ICommand,
    IModelFactory,
    ModelRenderer,
    ModelRendererFactory,
    PatcherProvider
} from "sprotty";
import { AbstractUIExtension } from "sprotty";
import type { Action } from "sprotty-protocol";
import { generateRequestId, SelectAllAction, SetModelAction, UpdateModelAction } from "sprotty-protocol";
import type { VNode } from "snabbdom";
import { h } from "snabbdom";
import { EditSpecification, Root } from "@hylimo/diagram-common";
import type { ConnectionEdit, ToolboxEdit } from "@hylimo/diagram-protocol";
import {
    EditorConfigUpdatedAction,
    ToolboxEditPredictionRequestAction,
    TransactionalAction
} from "@hylimo/diagram-protocol";
import { TYPES } from "../types.js";
import type { ConfigManager } from "../config/configManager.js";
import MiniSearch from "minisearch";
import type { ConnectionEditProvider } from "./connectionEditProvider.js";
import { generateToolbox } from "./views/toolbox.js";
import { ToolboxToolType } from "./toolType.js";
import type { Cursor } from "../cursor/cursor.js";
import { UpdateCursorAction } from "../cursor/cursor.js";
import { ToolState } from "./toolState.js";
import { SetToolAction } from "./setToolAction.js";

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
    currentRoot?: Root;

    /**
     * If true, pointer events are disabled
     */
    pointerEventsDisabled: boolean = false;

    /**
     * If true, the toolbox is open.
     */
    isOpen: boolean;

    /**
     * The edit for which to show a preview.
     * If undefined, no preview is shown.
     */
    showPreviewFor?: string;

    /**
     * The search string.
     * If set to a non-empty string, the search is active.
     */
    searchString: string = "";

    /**
     * The search string for the connection select.
     */
    connectionSearchString?: string;

    /**
     * The selected connection.
     */
    selectedConnection?: string;

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
    elementPreviews: Map<string, VNode | undefined> = new Map();

    /**
     * The model renderer.
     */
    private readonly renderer: ModelRenderer;

    /**
     * The patcher provider.
     */
    @inject(TYPES.PatcherProvider) private readonly patcherProvider!: PatcherProvider;

    /**
     * The action dispatcher.
     */
    @inject(TYPES.IActionDispatcher) readonly actionDispatcher!: IActionDispatcher;

    /**
     * The model factory, used to render previews.
     */
    @inject(TYPES.IModelFactory) private readonly modelFactory!: IModelFactory;

    /**
     * The tool state.
     */
    @inject(ToolState) toolState!: ToolState;

    /**
     * Creates a new toolbox.
     *
     * @param configManager The config manager
     * @param modelRendererFactory The model renderer factory, used to obtain the model renderer
     */
    constructor(
        @inject(TYPES.ConfigManager) readonly configManager: ConfigManager,
        @inject(TYPES.ModelRendererFactory) modelRendererFactory: ModelRendererFactory
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
            this.handleTransactionalAction(action);
        } else if (EditorConfigUpdatedAction.is(action)) {
            this.isOpen = action.config.toolboxEnabled;
            this.update();
        } else if (SetToolAction.is(action)) {
            this.updateTool(action.tool, false);
        }
    }

    /**
     * Handles a transactional action
     * Activates pointer events again if action is committed, and resets the tool if necessary.
     *
     * @param action the transactional action
     */
    private handleTransactionalAction(action: TransactionalAction) {
        let shouldUpdate = false;
        if (action.committed) {
            this.pointerEventsDisabled = false;
            shouldUpdate = true;
        }
        const toolType = this.toolState.toolType;
        if (!this.toolState.isLocked && toolType == ToolboxToolType.CONNECT) {
            this.updateTool(ToolboxToolType.CURSOR, false);
            shouldUpdate = true;
        }
        if (shouldUpdate) {
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
    update(): void {
        if (this.currentRoot != undefined) {
            this.currentVNode = this.patcherProvider.patcher(
                this.currentVNode!,
                generateToolbox(this, this.currentRoot)
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
     * Toggles the toolbox.
     */
    toggleToolbox(): void {
        this.isOpen = !this.isOpen;
        this.update();
        this.configManager.updateConfig({ toolboxEnabled: this.isOpen });
    }

    /**
     * Sets the currently used tool
     *
     * @param tool the new tool
     * @param locked if the tool should be locked
     */
    updateTool(tool: ToolboxToolType, locked: boolean): void {
        const toolType = this.toolState.toolType;
        if (toolType == tool && this.toolState.isLocked == locked) {
            return;
        }
        if (toolType != tool) {
            const actions: Action[] = [];
            let cusor: Cursor | null = null;
            if (tool == ToolboxToolType.HAND) {
                cusor = "cursor-grab";
            } else if (tool == ToolboxToolType.CONNECT || tool == ToolboxToolType.BOX_SELECT) {
                cusor = "cursor-crosshair";
            }
            const updateCursorAction: UpdateCursorAction = {
                kind: UpdateCursorAction.KIND,
                toolCursor: cusor
            };
            actions.push(updateCursorAction);
            if (tool == ToolboxToolType.CONNECT || tool == ToolboxToolType.HAND) {
                actions.push(SelectAllAction.create({ select: false }));
            }
            this.actionDispatcher.dispatchAll(actions);
        }
        this.toolState.toolType = tool;
        this.toolState.isLocked = locked;
        this.update();
    }

    /**
     * The current connection edit or undefined if no connection edit is available
     */
    get connectionEdit(): `connection/${string}` | undefined {
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
     * Gets the current connection operator
     * Uses {@link selectedConnection} if it is set and in the list of available connections
     *
     * @param connections the list of available connection operators
     * @returns the current connection operator or unefined if no connection operator is available
     */
    getCurrentConnection(connections: ConnectionEditEntry[]): string | undefined {
        if (
            this.selectedConnection != undefined &&
            connections.some((entry) => entry.name === this.selectedConnection)
        ) {
            return this.selectedConnection;
        }
        return connections[0]?.name;
    }

    /**
     * Extracts the toolbox edits from the root element.
     *
     * @param root The root element
     * @returns The toolbox edits
     */
    getToolboxEdits(root: Root): ToolboxEditEntry[] {
        return Object.entries(root.edits)
            .filter(([key, edit]) => key.startsWith("toolbox/") && EditSpecification.isConsistent([[edit]]))
            .map(([key]) => {
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
    getConnectionEdits(root: Root): ConnectionEditEntry[] {
        return Object.entries(root.edits)
            .filter(([key, edit]) => key.startsWith("connection/") && EditSpecification.isConsistent([[edit]]))
            .map(([key]) => ({ name: key.substring("connection/".length), edit: key as `connection/${string}` }));
    }

    /**
     * Shows a preview for a toolbox edit.
     * If no preview is available, a prediction is requested.
     *
     * @param edit The toolbox edit to show a preview for
     */
    showPreview(edit: ToolboxEditEntry | ConnectionEditEntry): void {
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
    getSearchIndex(): MiniSearch<ToolboxEditEntry> {
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
    getConnectionSearchIndex(): MiniSearch<ConnectionEditEntry> {
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

    /**
     * Checks if a toolbox tool is currently enabled.
     *
     * @param tool The toolbox tool
     * @returns True if the tool is enabled, false otherwise
     */
    isToolEnabled(tool: ToolboxToolType): boolean {
        if (tool === ToolboxToolType.ADD_ELEMENT) {
            return this.getToolboxEdits(this.currentRoot!).length > 0;
        } else if (tool === ToolboxToolType.CONNECT) {
            return this.getCurrentConnection(this.getConnectionEdits(this.currentRoot!)) != undefined;
        } else if (tool === ToolboxToolType.AUTOLAYOUT) {
            return false;
        }
        return true;
    }
}

/**
 * A toolbox edit entry
 */
export interface ToolboxEditEntry {
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
export interface ConnectionEditEntry {
    /**
     * The name of the connection operator
     */
    name: string;
    /**
     * The full key of the edit
     */
    edit: `connection/${string}`;
}
