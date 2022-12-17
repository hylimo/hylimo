import { numberType, stringType } from "@hylimo/core";
import { LayoutElement, AttributeConfig } from "../layoutElement";
import { StyledElementLayoutConfig } from "./styledElementLayoutConfig";

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
export abstract class ShapeLayoutConfig extends StyledElementLayoutConfig {
    /**
     * Assigns type and styleAttributes
     *
     * @param type the supported type
     * @param additionalAttributes additional non-style attributes
     * @param additionalStyleAttributes the supported additional style attributes
     */
    constructor(type: string, additionalAttributes: AttributeConfig[], additionalStyleAttributes: AttributeConfig[]) {
        super(type, additionalAttributes, [
            { name: "fill", description: "optional fill of the shape, must be a valid color string", type: stringType },
            {
                name: "fillOpacity",
                description: "optional fill opacity , must be a number between 0 and 1",
                type: numberType
            },
            { name: "stroke", description: "optional stroke, must be a valid color string", type: stringType },
            {
                name: "stokeOpacity",
                description: "optional stroke opacity, must be a number between 0 and 1",
                type: numberType
            },
            { name: "strokeWidth", description: "optional width of the stroke", type: numberType },
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
