import { CanvasLike } from "../../model/canvas/canvasLike.js";
import { ResizeMoveCursor } from "./cursor.js";

/**
 * Computes the offset to the index of a resize icon based on the elements rotation relative to the diagram root.
 * The resize icon index ranges from 0 to 7, where each step is a 45 degree rotation.
 * The computed offset can be applied to the index based on the location of the resize border, e.g. 0 for the top left corner,
 * to obtain the index of the icon which is rotated according to the element's rotation relative to the diagram root.
 *
 * @param canvas the canvas which forms the context
 * @param additionalRotation the additional rotation (e.g. for the canvas element) in degrees
 * @returns the offset for the rotation of the canvas element
 */

export function computeResizeIconOffset(canvas: Readonly<CanvasLike>, additionalRotation: number): number {
    const canvasRotation = canvas.globalRotation;
    const iconOffset = Math.round(((additionalRotation + canvasRotation) / 45) % 8);
    return iconOffset;
}
/**
 * Finds the resize icon class in a class list
 *
 * @param classList the class list to search in
 * @returns the resize icon class or undefined
 */

export function findResizeIconClass(classList: DOMTokenList): ResizeMoveCursor | undefined {
    for (let i = 0; i < classList.length; i++) {
        const item = classList.item(i);
        if (item?.startsWith("cursor-resize-")) {
            return item as ResizeMoveCursor;
        }
    }
    return undefined;
}
