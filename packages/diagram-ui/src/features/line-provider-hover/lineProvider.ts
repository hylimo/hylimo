import { SModelElementImpl } from "sprotty";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import { SCanvasElement } from "../../model/canvas/sCanvasElement.js";

/**
 * Checks if the element is a canvas element or connection
 *
 * @param target the target element
 * @returns true if the element is a canvas element or connection
 */
export function isLineProvider(element: SModelElementImpl): element is SCanvasElement | SCanvasConnection {
    return element instanceof SCanvasElement || element instanceof SCanvasConnection;
}
