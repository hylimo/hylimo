import { LayoutElement } from "../layoutElement";
import { BaseElementLayoutConfig } from "./baseElementLayoutConfig";

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
    extractShapeProperties(element: LayoutElement): {
        fill?: string;
        fillOpacity?: number;
        stroke?: string;
        strokeOpacity?: number;
        strokeWidth?: number;
    } {
        const styles = element.styles;
        return {
            fill: styles.fill,
            fillOpacity: styles.fillOpacity,
            stroke: styles.stroke,
            strokeOpacity: styles.strokeOpacity,
            strokeWidth: styles.strokeWidth
        };
    }
}
