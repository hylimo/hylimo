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
import { EditSpecification, Root } from "@hylimo/diagram-common";
import {
    ConnectionEdit,
    EditorConfigUpdatedAction,
    ToolboxEdit,
    ToolboxEditPredictionRequestAction,
    TransactionalAction
} from "@hylimo/diagram-protocol";
import { TYPES } from "../types.js";
import { ConfigManager } from "../config/configManager.js";
import MiniSearch from "minisearch";
import { ConnectionEditProvider } from "./connectionEditProvider.js";
import { generateToolbox } from "./views/toolbox.js";
import { ToolboxToolType } from "./tools.js";

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
     * The currently selected toolbox tool.
     */
    currentTool: {
        type: ToolboxToolType;
        locked: boolean;
    } = {
        type: ToolboxToolType.CURSOR,
        locked: false
    };

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
    @inject(SPROTTY_TYPES.PatcherProvider) private readonly patcherProvider!: PatcherProvider;

    /**
     * The action dispatcher.
     */
    @inject(SPROTTY_TYPES.IActionDispatcher) readonly actionDispatcher!: IActionDispatcher;

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
     * Gets the current connection operator
     * Uses {@link selectedConnection} if it is set and in the list of available connections
     *
     * @param connections the list of available connection operators
     * @returns the current connection operator
     */
    getCurrentConnection(connections: ConnectionEditEntry[]): string {
        if (
            this.selectedConnection != undefined &&
            connections.some((entry) => entry.name === this.selectedConnection)
        ) {
            return this.selectedConnection;
        }
        return connections[0].name;
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
