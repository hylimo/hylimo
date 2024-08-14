import { Marker } from "@hylimo/diagram-common";
import { SElement } from "../sElement.js";

/**
 * Model for Marker
 */
export class SMarker extends SElement implements Marker {
    override type!: typeof Marker.TYPE;
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
}
