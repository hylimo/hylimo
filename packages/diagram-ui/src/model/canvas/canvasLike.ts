import { SModelElementImpl } from "sprotty";
import { PointVisibilityManager } from "./pointVisibilityManager.js";
import { Matrix } from "transformation-matrix";

/**
 * Interface for elements that are like a canvas (e.g. SCanvas, SRoot)
 */
export interface CanvasLike {
    /**
     * Gets the PointVisibilityManager
     */
    pointVisibilityManager: PointVisibilityManager;

    /**
     * The global rotation of the canvas in 45° steps
     * (used for UI elements which depend on global roation, e.g. cursor icons)
     */
    globalRotation: number;

    /**
     * Gets a transformation matrix which can be applied to mouse events
     *
     * @returns the transformation matrix
     */
    getMouseTransformationMatrix(): Matrix;
}

/**
 * Checks if a value is a CanvasLike
 *
 * @param value the element to check
 * @returns true if the element is a CanvasLike
 */
export function isCanvasLike(value: SModelElementImpl): value is CanvasLike & SModelElementImpl {
    return "pointVisibilityManager" in value && "globalRotation" in value;
}
