import { inject, injectable } from "inversify";
import {
    AbstractUIExtension,
    IActionDispatcher,
    IActionHandler,
    ICommand,
    PatcherProvider,
    TYPES as SPROTTY_TYPES
} from "sprotty";
import { Action, SetModelAction, UpdateModelAction } from "sprotty-protocol";
import { VNode, h } from "snabbdom";
import { Root } from "@hylimo/diagram-common";
import { CreateAndMoveAction } from "../create-move/createAndMoveAction.js";
import { EditorConfigUpdatedAction, TransactionalAction } from "@hylimo/diagram-protocol";
import { TYPES } from "../types.js";
import { ConfigManager } from "../config/configManager.js";

@injectable()
export class Toolbox extends AbstractUIExtension implements IActionHandler {
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
     * If true, the toolbox is closed.
     */
    private isClosed: boolean;

    /**
     * The patcher provider.
     */
    @inject(SPROTTY_TYPES.PatcherProvider) private readonly patcherProvider!: PatcherProvider;

    /**
     * The action dispatcher.
     */
    @inject(SPROTTY_TYPES.IActionDispatcher) private readonly actionDispatcher!: IActionDispatcher;

    /**
     * Creates a new toolbox.
     *
     * @param configManager The config manager
     */
    constructor(@inject(TYPES.ConfigManager) private readonly configManager: ConfigManager) {
        super();
        this.isClosed = configManager.config?.toolboxDisabled ?? false;
    }

    handle(action: Action): ICommand | Action | void {
        if (action.kind === UpdateModelAction.KIND || action.kind === SetModelAction.KIND) {
            if ((action as UpdateModelAction | SetModelAction).newRoot?.type === Root.TYPE) {
                const root = (action as UpdateModelAction | SetModelAction).newRoot as Root;
                this.currentRoot = root;
                this.initializeToolbox();
            }
        } else if (TransactionalAction.isTransactionalAction(action)) {
            if (action.committed) {
                this.pointerEventsDisabled = false;
                this.update();
            }
        } else if (EditorConfigUpdatedAction.is(action)) {
            this.isClosed = action.config.toolboxDisabled;
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
        const toolboxButton = this.isClosed
            ? this.generateCodiconButton("tools", "Open Toolbox", () => this.toggleToolbox())
            : this.generateCodiconButton("chrome-close", "Close Toolbox", () => this.toggleToolbox());
        return h(
            "div.toolbox",
            {
                class: {
                    "pointer-events-disabled": this.pointerEventsDisabled,
                    closed: this.isClosed
                }
            },
            [
                h("div.toolbox-header", [h("span.title", "Toolbox"), toolboxButton]),
                h("div.items", this.generateToolboxItems(root))
            ]
        );
    }

    /**
     * Toggles the toolbox.
     */
    private toggleToolbox(): void {
        this.isClosed = !this.isClosed;
        this.update();
        this.configManager.updateConfig({ toolboxDisabled: this.isClosed });
    }

    /**
     * Generates a codicon button.
     *
     * @param icon the name of the codicon
     * @param title the title of the button
     * @param action the action to execute when the button is clicked
     * @returns the codicon button
     */
    private generateCodiconButton(icon: string, title: string, action: () => void): VNode {
        return h(
            "button.codicon-button",
            {
                on: {
                    click: action
                }
            },
            [
                h("i.codicon", {
                    attrs: {
                        title
                    },
                    class: {
                        [`codicon-${icon}`]: true
                    }
                })
            ]
        );
    }

    /**
     * Generates the UI for the toolbox items.
     *
     * @param root The root element providing the toolbox edits
     * @returns The UI for the toolbox items
     */
    private generateToolboxItems(root: Root): VNode[] {
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
                        const action: CreateAndMoveAction = {
                            kind: CreateAndMoveAction.KIND,
                            edit: toolboxEdit.edit,
                            targetMode: false,
                            event
                        };
                        this.pointerEventsDisabled = true;
                        this.update();
                        this.actionDispatcher.dispatch(action);
                    }
                }
            },
            toolboxEdit.name
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
                return { group, name, edit: key };
            });
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
    edit: string;
}
