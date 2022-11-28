/**
 * Base class for all elements
 */
export interface Element {
    /**
     * The type of the element
     */
    type: string;
    /**
     * A unique id of the element
     */
    id: string;
    /**
     * The x coordinate of the element
     */
    x: number;
    /**
     * The y coordinate of the element
     */
    y: number;
    /**
     * The width of the element
     */
    width: number;
    /**
     * The height of the element
     */
    height: number;
    /**
     * Child elements
     */
    contents: Element[];
}

/**
 * An element which displays some graphics
 */
export interface Shape extends Element {
    /**
     * The color of the fill of the shape
     */
    fill?: string;
    /**
     * The opacity applied to the fill
     */
    fillOpacity?: number;
    /**
     * The color of the stroke
     */
    stroke?: string;
    /**
     * The opacity applied to the stroke
     */
    strokeOpacity?: number;
    /**
     * The width of the stroke
     */
    strokeWidth?: number;
}
