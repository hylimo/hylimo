import { Selectable } from "sprotty-protocol";
import { SElement } from "../sElement.js";
import { SParentElementImpl } from "sprotty";
import { CanvasLike } from "./canvasLike.js";
import { LineProviderHoverDataProvider } from "../../features/line-provider-hover/lineProviderHoverData.js";

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
    get hoverDataProvider(): LineProviderHoverDataProvider | undefined {
        const provider = this.root.lineProviderHoverDataProvider;
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
