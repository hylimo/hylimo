import { LayoutedElement, Shape, StrokedElement } from "@hylimo/diagram-common";

/**
 * SVG layout attributes
 */
export interface LayoutAttributes {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Extracts layout attributes
 *
 * @param model the model which provides the attributes
 * @returns the extracted attribzutes
 */
export function extractLayoutAttributes(model: Readonly<LayoutedElement>): LayoutAttributes {
    return {
        x: model.x,
        y: model.y,
        width: model.width,
        height: model.height
    };
}

/**
 * Extracts layout and style properties for shapes
 * Normalizes the position and size based on the stroke width
 *
 * @param model the model which provides the attributes
 * @returns the extracted attributes
 */
export function extractOutlinedShapeAttributes(model: Readonly<Shape>): ShapeAttributes {
    const res = extractShapeAttributes(model);
    if (model.strokeWidth) {
        res.x += model.strokeWidth / 2;
        res.y += model.strokeWidth / 2;
        res.width = Math.max(0, res.width - model.strokeWidth);
        res.height = Math.max(0, res.height - model.strokeWidth);
    }
    return res;
}

/**
 * SVG stroke attributes
 */
export interface StrokeAttributes {
    stroke?: string;
    "stroke-opacity"?: number;
    "stroke-width"?: number;
    "stroke-dasharray"?: string;
}

/**
 * Extracts stroke style attributes
 *
 * @param model the model which provides the attributes
 * @returns the extracted attributes
 */
export function extractStrokeAttriabutes(model: Readonly<StrokedElement>): StrokeAttributes {
    const res: StrokeAttributes = {};
    if (model.stroke != undefined) {
        res.stroke = model.stroke;
        if (model.strokeOpacity != undefined) {
            res["stroke-opacity"] = model.strokeOpacity;
        }
        res["stroke-width"] = model.strokeWidth ?? 1;
        if (model.strokeDash != undefined) {
            res["stroke-dasharray"] = `${model.strokeDash} ${model.strokeDashSpace ?? model.strokeDash}`;
        }
    }
    return res;
}

/**
 * SVG shape attributes, includes layout and stroke attributes
 */
export interface ShapeAttributes extends StrokeAttributes, LayoutAttributes {
    fill: string;
    "fill-opacity"?: number;
}

/**
 * Extracts layout and style properties for shapes
 *
 * @param model the model which provides the attributes
 * @returns the extracted attributes
 */
export function extractShapeAttributes(model: Readonly<Shape>): ShapeAttributes {
    const res: ShapeAttributes = {
        ...extractLayoutAttributes(model),
        ...extractStrokeAttriabutes(model),
        fill: model.fill ?? "none"
    };
    if (model.fillOpacity != undefined) {
        res["fill-opacity"] = model.fillOpacity;
    }
    return res;
}
