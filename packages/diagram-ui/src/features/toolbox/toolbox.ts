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
import { generateRequestId, SelectAction, SelectAllAction, SetModelAction, UpdateModelAction } from "sprotty-protocol";
import type { VNode } from "snabbdom";
import { h } from "snabbdom";
import {
    CanvasConnection,
    CanvasElement,
    CanvasPoint,
    EditSpecification,
    Root,
    type Element
} from "@hylimo/diagram-common";
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
import type { SettingsProvider } from "../settings/settingsProvider.js";
import jsonata, { type ExprNode } from "jsonata";
import type { TransactionIdProvider } from "../transaction/transactionIdProvider.js";

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
     * Cached toolbox edits
     */
    private toolboxEdits?: ToolboxEditEntry[];

    /**
     * Cached connection edits
     */
    private connectionEdits?: ConnectionEditEntry[];

    /**
     * Cached rendered element previews.
     */
    elementPreviews: Map<string, VNode | undefined> = new Map();

    /**
     * The model renderer.
     */
    private readonly renderer: ModelRenderer;

    /**
     * The ids of the currently selected elements.
     */
    private readonly selectedElements = new Set<string>();

    /**
     * The index of elements, used to quickly access elements by id.
     */
    private index: Map<string, Element> | undefined = undefined;

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
     * The settings provider
     */
    @inject(TYPES.SettingsProvider) readonly settingsProvider!: SettingsProvider;

    /**
     * The transaction id provider
     */
    @inject(TYPES.TransactionIdProvider) transactionIdProvider!: TransactionIdProvider;

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
            this.handleUpdateModelAction(action as UpdateModelAction | SetModelAction);
        } else if (TransactionalAction.isTransactionalAction(action)) {
            this.handleTransactionalAction(action);
        } else if (EditorConfigUpdatedAction.is(action)) {
            this.isOpen = action.config.toolboxEnabled;
            this.update();
        } else if (SetToolAction.is(action)) {
            this.updateTool(action.tool, false);
        } else if (action.kind === SelectAction.KIND || action.kind === SelectAllAction.KIND) {
            this.handleSelectAction(action as SelectAction | SelectAllAction);
        }
    }

    /**
     * Clears all cached data
     */
    private resetCache(): void {
        this.elementPreviews.clear();
        this.searchIndex = undefined;
        this.connectionSearchIndex = undefined;
        this.index = undefined;
        this.toolboxEdits = undefined;
        this.connectionEdits = undefined;
    }

    /**
     * Handles UpdateModelAction and SetModelAction to update the toolbox state when the model changes.
     * This method:
     *
     * @param action The UpdateModelAction or SetModelAction containing the new model root
     * @returns returns early if the new root is not of type Root.TYPE
     */
    private handleUpdateModelAction(action: UpdateModelAction | SetModelAction): void {
        if (action.newRoot?.type !== Root.TYPE) {
            return;
        }
        const root = action.newRoot as Root;
        this.currentRoot = root;
        this.initializeToolbox();
        this.resetCache();
        for (const selected of this.selectedElements) {
            if (this.getIndex().get(selected) == undefined) {
                this.selectedElements.delete(selected);
            }
        }
        this.update();
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
     * Handles a Select(All)Action and resets the cache if necessary.
     *
     * @param action The Select(All)Action to handle
     */
    private handleSelectAction(action: SelectAction | SelectAllAction): void {
        const oldSelected = this.selectedElements.size === 1 ? this.selectedElements.values().next().value : undefined;
        if (action.kind === SelectAction.KIND) {
            (action as SelectAction).selectedElementsIDs.forEach((id) => this.selectedElements.add(id));
            (action as SelectAction).deselectedElementsIDs.forEach((id) => this.selectedElements.delete(id));
        } else {
            if (action.select) {
                if (this.currentRoot != undefined) {
                    this.selectedElements.clear();
                    for (const element of this.getIndex().values()) {
                        if (
                            CanvasElement.isCanvasElement(element) ||
                            CanvasConnection.isCanvasConnection(element) ||
                            CanvasPoint.isCanvasPoint(element)
                        ) {
                            this.selectedElements.add(element.id);
                        }
                    }
                }
            } else {
                this.selectedElements.clear();
            }
        }
        const newSelected = this.selectedElements.size === 1 ? this.selectedElements.values().next().value : undefined;
        if (oldSelected !== newSelected) {
            this.resetCache();
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
            this.currentVNode = this.patcherProvider.patcher(this.currentVNode!, generateToolbox(this));
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
        const connections = this.getConnectionEdits();
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
     * @returns The toolbox edits
     */
    getToolboxEdits(): ToolboxEditEntry[] {
        if (this.toolboxEdits == undefined) {
            const target =
                this.selectedElements.size === 1
                    ? this.getIndex().get(this.selectedElements.values().next().value!)!
                    : this.currentRoot!;
            const entries = Object.entries(target.edits).filter(
                ([key, edit]) => key.startsWith("toolbox/") && EditSpecification.isConsistent([[edit]])
            );
            this.toolboxEdits = entries
                .map(([key, entry]) => {
                    const [group, name] = key.substring("toolbox/".length).split("/");
                    const info = { canMove: false, requiresExpression: false };
                    for (const template of entry.template) {
                        if (typeof template === "string") {
                            this.extractTemplateInformationRecursive(jsonata(template).ast(), info);
                        }
                    }
                    return {
                        group,
                        name,
                        edit: key as `toolbox/${string}`,
                        target: { id: target.id, editExpression: (target as CanvasElement).editExpression },
                        ...info
                    };
                })
                .filter((entry) => !entry.requiresExpression || entry.target.editExpression != undefined);
        }
        return this.toolboxEdits;
    }

    /**
     * Extracts template information from the given node recursively.
     * Updates the provided info object with the extracted information.
     *
     * @param node The node to extract information from
     * @param info The info object to update
     */
    private extractTemplateInformationRecursive(
        node: ExprNode | ExprNode[] | undefined,
        info: Pick<ToolboxEditEntry, "canMove" | "requiresExpression">
    ): void {
        if (node == undefined) {
            return;
        }
        if (Array.isArray(node)) {
            for (const child of node) {
                this.extractTemplateInformationRecursive(child, info);
            }
        } else {
            if (node.type === "name") {
                if (node.value === "x" || node.value === "y") {
                    info.canMove = true;
                } else if (node.value === "expression") {
                    info.requiresExpression = true;
                }
            } else {
                this.extractTemplateInformationRecursive(node.arguments, info);
                this.extractTemplateInformationRecursive(node.lhs, info);
                this.extractTemplateInformationRecursive(node.rhs, info);
                this.extractTemplateInformationRecursive(node.steps, info);
                this.extractTemplateInformationRecursive(node.expressions, info);
                this.extractTemplateInformationRecursive(node.procedure, info);
                this.extractTemplateInformationRecursive(node.stages, info);
            }
        }
    }

    /**
     * Extracts the connection edits from the root element.
     *
     * @param root The root element
     * @returns The connection edits
     */
    getConnectionEdits(): ConnectionEditEntry[] {
        if (this.connectionEdits == undefined) {
            this.connectionEdits = Object.entries(this.currentRoot!.edits)
                .filter(([key, edit]) => key.startsWith("connection/") && EditSpecification.isConsistent([[edit]]))
                .map(([key]) => ({ name: key.substring("connection/".length), edit: key as `connection/${string}` }));
        }
        return this.connectionEdits;
    }

    /**
     * Shows a preview for a toolbox edit.
     * If no preview is available, a prediction is requested.
     *
     * @param edit The toolbox edit to show a preview for
     * @param targetId The id of the element to edit
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
                    prediction: true,
                    expression: (edit as ToolboxEditEntry).target.editExpression
                },
                elements: [(edit as ToolboxEditEntry).target.id]
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
            this.searchIndex.addAll(this.getToolboxEdits().map((edit) => ({ ...edit, id: edit.edit })));
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
            this.connectionSearchIndex.addAll(this.getConnectionEdits().map((edit) => ({ ...edit, id: edit })));
        }
        return this.connectionSearchIndex;
    }

    /**
     * Gets the index of all elements in the current root.
     * The index is a map that allows quick lookup of elements by their ID.
     * If the index doesn't exist yet, it will be built by traversing the entire element tree.
     *
     * @returns A map containing all elements indexed by their ID, or an empty map if no root exists
     */
    private getIndex(): Map<string, Element> {
        if (this.currentRoot == undefined) {
            return new Map();
        }
        if (this.index == undefined) {
            this.index = new Map();
            this.buildIndexRecursive(this.currentRoot);
        }
        return this.index;
    }

    /**
     * Recursively builds the element index by traversing the element tree.
     * This method adds the current element to the index and then recursively
     * processes all of its children.
     *
     * @param element The element to add to the index and whose children to process recursively
     */
    private buildIndexRecursive(element: Element) {
        this.index!.set(element.id, element);
        for (const child of element.children) {
            this.buildIndexRecursive(child);
        }
    }

    /**
     * Checks if a toolbox tool is currently enabled.
     *
     * @param tool The toolbox tool
     * @returns True if the tool is enabled, false otherwise
     */
    isToolEnabled(tool: ToolboxToolType): boolean {
        if (tool === ToolboxToolType.ADD_ELEMENT) {
            return this.getToolboxEdits().length > 0;
        } else if (tool === ToolboxToolType.CONNECT) {
            return this.getCurrentConnection(this.getConnectionEdits()) != undefined;
        } else if (tool === ToolboxToolType.AUTOLAYOUT) {
            return false;
        }
        return true;
    }

    /**
     * Checks if the toolbox is in selected element mode.
     * This is true if exactly one element is selected.
     */
    get selectedElementMode(): boolean {
        return this.selectedElements.size === 1;
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
    /**
     * The id & optional edit expression of the target element
     */
    target: Pick<CanvasElement, "id" | "editExpression">;
    /**
     * If true, dragging this item is allowed
     */
    canMove: boolean;
    /**
     * If true, the item requires an expression for the element to be set
     */
    requiresExpression: boolean;
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
