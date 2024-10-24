/**
 * A colored element, either stroke or fill
 */
export interface Colored {
    /**
     * The color
     */
    color: string;
    /**
     * The opacity
     */
    opacity: number;
}

/**
 * A basic stroke without line join, cap or miter limit information
 */
export interface SimpleStroke extends Colored {
    /**
     * The width of the stroke
     */
    width: number;
    /**
     * The length of the dashes, stroke is not dashed if not set
     */
    dash?: number;
    /**
     * The space between dashes, defaults to strokeDash
     */
    dashSpace?: number;
}

/**
 * A stroke
 */
export interface Stroke extends SimpleStroke {
    /**
     * Defines how segments are joined together
     */
    lineJoin: LineJoin;
    /**
     * Defines how the end of a line is drawn
     */
    lineCap: LineCap;
    /**
     * Defines the max miter length relative to the line width
     */
    miterLimit: number;
}

/**
 * A fill
 */
export type Fill = Colored;

/**
 * Stroke line join styles
 */
export enum LineJoin {
    Miter = "miter",
    Round = "round",
    Bevel = "bevel"
}

/**
 * Stroke line cap styles
 */
export enum LineCap {
    Butt = "butt",
    Round = "round",
    Square = "square"
}
