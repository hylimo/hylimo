import { Selectable } from "sprotty-protocol";
import { SElement } from "../sElement.js";
import { SCanvas } from "./sCanvas.js";

/**
 * Base class for all canvas contents
 */
export abstract class SCanvasContent extends SElement implements Selectable {
    override parent!: SCanvas;
    private _selected = false;

    get selected(): boolean {
        return this._selected;
    }

    set selected(value: boolean) {
        this._selected = value;
        this.parent.pointVisibilityManager.setSelectionState(this, value);
    }

    /**
     * List of dependencies of this CanvasContent
     */
    abstract get dependencies(): string[];
}
