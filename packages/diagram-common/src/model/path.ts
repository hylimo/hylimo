import { Shape } from "./shape";

/**
 * An SVG path shape
 */
export interface Path extends Shape {
    type: "path";
    /**
     * Defines the path
     */
    path: string;
}
