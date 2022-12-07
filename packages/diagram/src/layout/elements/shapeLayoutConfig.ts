import { LayoutElement } from "../layoutElement";
import { BaseElementLayoutConfig } from "./baseElementLayoutConfig";

/**
 * Helper interface for shape properties
 */
export interface ShapeProperties {
    /**
     * The fill color
     */
    fill?: string;
    /**
     * The fill opacity
     */
    fillOpacity?: number;
    /**
     * The stroke color
     */
    stroke?: string;
    /**
     * The stroke opacity
     */
    strokeOpacity?: number;
    /**
     * The stroke width
     */
    strokeWidth?: number;
}

/**
 * Base class for all shape layout configs
 */
export abstract class ShapeLayoutConfig extends BaseElementLayoutConfig {
    /**
     * Assigns type and styleAttributes
     *
     * @param type the supported type
     * @param additionalStyleAttributes the supported additional style attributes
     */
    constructor(type: string, additionalStyleAttributes: string[]) {
        super(type, [
            "fill",
            "fillOpacity",
            "stroke",
            "stokeOpacity",
            "strokeWidth",
            "strokeDash",
            ...additionalStyleAttributes
        ]);
    }

    /**
     * Helper to get shape styles properties
     *
     * @param element provides the styles
     * @returns an object with all shape style properties
     */
    extractShapeProperties(element: LayoutElement): ShapeProperties {
        const styles = element.styles;
        const res: ShapeProperties = {
            fill: styles.fill,
            fillOpacity: styles.fillOpacity,
            stroke: styles.stroke
        };
        if (res.stroke) {
            res.strokeOpacity = styles.strokeOpacity;
            res.strokeWidth = styles.strokeWidth;
        }
        return res;
    }

    /**
     * Sets the stroke width to 0 if stroke is not defined,
     * if stroke defined, strokeWidth defaults to 1
     *
     * @param element provides the styles map
     */
    normalizeStrokeWidth(element: LayoutElement): void {
        const styles = element.styles;
        styles.strokeWidth = styles.stroke ? styles.strokeWidth ?? 1 : 0;
    }
}
