import type { Marker } from "@hylimo/diagram-common";
import { SElement } from "../sElement.js";
import type { Selectable } from "sprotty-protocol";
import type { SCanvasConnection } from "./sCanvasConnection.js";

/**
 * Model for Marker
 */
export class SMarker extends SElement implements Marker, Selectable {
    override type!: typeof Marker.TYPE;
    override parent!: SCanvasConnection;
    private _selected = false;

    get selected(): boolean {
        return this._selected;
    }

    set selected(value: boolean) {
        this._selected = value;
        this.parent.parent.pointVisibilityManager.setSelectionState(this, value);
    }
    /**
     * The width of the element
     */
    width!: number;
    /**
     * The height of the element
     */
    height!: number;
    /**
     * Is it a start or end marker?
     */
    pos!: "start" | "end";
    /**
     * The position on the vertical center line where the line actually starts
     */
    lineStart!: number;
    /**
     * The x coordinate of the reference point
     */
    refX!: number;
    /**
     * The y coordinate of the reference point
     */
    refY!: number;

    /**
     * The id of the start/end (depending on pos) of the parent connection
     */
    get posId(): string {
        return this.pos === "start" ? this.parent.start : this.parent.segments.at(-1)!.end;
    }

    /**
     * List of dependencies of this Marker
     */
    get dependencies(): string[] {
        return [this.posId];
    }
}
