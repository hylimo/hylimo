import { SModelElement } from "sprotty-protocol";

/**
 * Base class for all elements
 */
export interface Element extends SModelElement {
    /**
     * Child elementes
     */
    children: Element[];
}
