import { inject, injectable } from "inversify";
import { AbstractUIExtension, IActionDispatcher, IActionHandler, ICommand, PatcherProvider, TYPES } from "sprotty";
import { Action, SetModelAction, UpdateModelAction } from "sprotty-protocol";
import { VNode, h } from "snabbdom";
import { Root } from "@hylimo/diagram-common";
import { CreateAndMoveAction } from "../create-move/createAndMoveAction.js";
import { TransactionalAction } from "@hylimo/diagram-protocol";

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
     * The patcher provider.
     */
    @inject(TYPES.PatcherProvider) private readonly patcherProvider!: PatcherProvider;

    /**
     * The action dispatcher.
     */
    @inject(TYPES.IActionDispatcher) private readonly actionDispatcher!: IActionDispatcher;

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

    private generateToolbox(root: Root): VNode {
        return h(
            "div.toolbox",
            {
                class: {
                    "pointer-events-disabled": this.pointerEventsDisabled
                }
            },
            [h("div.toolbox-header", ["Toolbox"]), h("div.items", this.generateToolboxItems(root))]
        );
    }

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

    private generateToolboxItemGroup(group: string, toolboxEdits: ToolboxEdit[]): VNode {
        return h("div.group", [
            h("div.group-header", group),
            ...toolboxEdits.map((toolboxEdit) => this.generateToolboxItem(toolboxEdit))
        ]);
    }

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
