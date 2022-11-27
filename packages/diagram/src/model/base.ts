/**
 * Base class for all elements
 */
export interface Element {
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
 * Defines dashes for a stroke
 */
export interface StrokeDash {
    /**
     * The length of the individual dash
     */
    length: number;
    /**
     * The length of the space between dashes, defaults to length
     */
    space?: number;
    /**
     * The offset of the first dash, defaults to 0
     */
    offset?: number;
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
    /**
     * If provided, the dashes used for the stroke
     */
    strokeDash?: StrokeDash;
}
