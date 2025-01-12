import { Selectable } from "sprotty-protocol";
import { SElement } from "../sElement.js";
import { SParentElementImpl } from "sprotty";
import { CanvasLike } from "./canvasLike.js";
import { CreateConnectionDataProvider } from "../../features/connection-creation/createConnectionData.js";

/**
 * Base class for all canvas contents
 */
export abstract class SCanvasContent extends SElement implements Selectable {
    override parent!: SParentElementImpl & CanvasLike;
    private _selected = false;

    get selected(): boolean {
        return this._selected;
    }

    set selected(value: boolean) {
        this._selected = value;
        this.parent.pointVisibilityManager.setSelectionState(this, value);
    }

    /**
     * If defined, can provide information on how the connection creation UI should be displayed
     */
    get createConnectionProvider(): CreateConnectionDataProvider | undefined {
        const provider = this.root.createConnectionProvider;
        if (provider?.target === this.id) {
            return provider;
        }
        return undefined;
    }

    /**
     * List of dependencies of this CanvasContent
     */
    abstract get dependencies(): string[];
}
