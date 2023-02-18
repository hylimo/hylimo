import { Shape } from "@hylimo/diagram-common";
import { LayoutElement, AttributeConfig } from "../layoutElement";
import { shapeStyleAttributes } from "./attributes";
import { StyledElementLayoutConfig } from "./styledElementLayoutConfig";

/**
 * Helper interface for shape properties
 */
export type ShapeProperties = Pick<Shape, "fill" | "fillOpacity" | "stroke" | "strokeOpacity" | "strokeWidth">;

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
        super(type, additionalAttributes, [...shapeStyleAttributes, ...additionalStyleAttributes]);
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
