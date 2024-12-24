import { injectable } from "inversify";
import { AbstractUIExtension, EMPTY_ROOT, IActionHandler, ICommand } from "sprotty";
import { Action, SetModelAction, UpdateModelAction } from "sprotty-protocol";

@injectable()
export class Toolbox extends AbstractUIExtension implements IActionHandler {
    /**
     * The unique identifier of the toolbox.
     */
    static readonly ID = "toolbox";

    handle(action: Action): ICommand | Action | void {
        if (action.kind === UpdateModelAction.KIND || action.kind === SetModelAction.KIND) {
            if ((action as UpdateModelAction | SetModelAction).newRoot != EMPTY_ROOT) {
                this.initializeToolbox();
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
    }

    override id(): string {
        return Toolbox.ID;
    }

    override containerClass(): string {
        return Toolbox.ID;
    }

    protected override initializeContents(containerElement: HTMLElement): void {
        console.log("Initializing toolbox");
        console.log(containerElement);
    }
}
