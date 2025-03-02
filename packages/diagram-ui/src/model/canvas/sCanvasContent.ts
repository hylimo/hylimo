import type { Selectable } from "sprotty-protocol";
import { SElement } from "../sElement.js";
import type { SParentElementImpl } from "sprotty";
import type { CanvasLike } from "./canvasLike.js";
import type { LineProviderHoverData } from "../../features/create-connection/createConnectionHoverData.js";

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
     * If defined, can provide information on how the user hovers over a line provider
     */
    get hoverData(): LineProviderHoverData | undefined {
        const data = this.root.createConnectionHoverData;
        if (data != undefined && "target" in data && data.target === this.id) {
            return data;
        }
        return undefined;
    }

    /**
     * List of dependencies of this CanvasContent
     */
    abstract get dependencies(): string[];
}
