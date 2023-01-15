import { SChildElement, Selectable } from "sprotty";
import { SCanvas } from "./canvas";

/**
 * Base class for all canvas contents
 */
export abstract class SCanvasContent extends SChildElement implements Selectable {
    override parent!: SCanvas;
    private _selected = false;

    get selected(): boolean {
        return this._selected;
    }

    set selected(value: boolean) {
        this._selected = value;
        this.parent.pointVisibilityManager.setSelectionState(this, value);
    }
}
