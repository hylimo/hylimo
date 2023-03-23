/**
 * Base class for all elements
 */
export interface Element {
    /**
     * The type of the element
     */
    type: string;
    /**
     * The id of the element, must be globally unique
     */
    id: string;
    /**
     * Child elementes
     */
    children: Element[];
}
