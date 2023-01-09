import { SModelElement } from "sprotty-protocol";
import { Point } from "../common/point";
import { Size } from "../common/size";

/**
 * Base class for all elements
 */
export interface Element extends SModelElement, Point, Size {
    /**
     * Child elementes
     */
    children: Element[];
}
