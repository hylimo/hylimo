import { Shape } from "@hylimo/diagram-common";
import { LayoutElement, AttributeConfig, ContentCardinality } from "../layoutElement.js";
import { extractFillStyleAttributes, extractStrokeStyleAttributes, shapeStyleAttributes } from "./attributes.js";
import { StyledElementLayoutConfig } from "./styledElementLayoutConfig.js";
import { Type } from "@hylimo/core";

/**
 * Helper interface for shape properties
 */
export type ShapeProperties = Pick<Shape, "fill" | "stroke">;

/**
 * Base class for all shape layout configs
 */
export abstract class ShapeLayoutConfig extends StyledElementLayoutConfig {
    /**
     * Assigns type and styleAttributes
     *
     * @param additionalAttributes additional non-style attributes
     * @param additionalStyleAttributes the supported additional style attributes
     * @param contentType the type of the contents attribute
     * @param contentCardinality the cardinality of the contents attribute
     */
    constructor(
        additionalAttributes: AttributeConfig[],
        additionalStyleAttributes: AttributeConfig[],
        contentType: Type,
        contentCardinality: ContentCardinality
    ) {
        super(
            additionalAttributes,
            [...shapeStyleAttributes, ...additionalStyleAttributes],
            contentType,
            contentCardinality
        );
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
            ...extractFillStyleAttributes(styles),
            ...extractStrokeStyleAttributes(styles)
        };
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
        styles.strokeWidth = styles.stroke ? (styles.strokeWidth ?? 1) : 0;
    }
}
