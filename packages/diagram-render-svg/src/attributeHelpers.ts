import { LayoutedElement, LineCap, LineJoin, Shape, StrokedElement } from "@hylimo/diagram-common";
import { FilledElement } from "@hylimo/diagram-common";

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
export function extractOutlinedShapeAttributes(model: Readonly<Shape>): ShapeStyleAttributes & LayoutAttributes {
    const res = { ...extractShapeStyleAttributes(model), ...extractLayoutAttributes(model) };
    const strokeWidth = model.stroke?.width;
    if (strokeWidth) {
        res.x += strokeWidth / 2;
        res.y += strokeWidth / 2;
        res.width = Math.max(0, res.width - strokeWidth);
        res.height = Math.max(0, res.height - strokeWidth);
    }
    return res;
}

/**
 * SVG stroke attributes
 */
export interface StrokeAttributes {
    stroke: string;
    "stroke-opacity"?: number;
    "stroke-width"?: number;
    "stroke-dasharray"?: string;
    "stroke-linejoin"?: LineJoin;
    "stroke-linecap"?: LineCap;
    "stroke-miterlimit"?: number;
}

/**
 * Extracts stroke style attributes
 *
 * @param model the model which provides the attributes
 * @returns the extracted attributes
 */
export function extractStrokeAttriabutes(model: Readonly<StrokedElement>): StrokeAttributes {
    const res: StrokeAttributes = {
        stroke: "none"
    };
    if (model.stroke != undefined) {
        const stroke = model.stroke;
        res.stroke = stroke.color;
        if (stroke.opacity != 1) {
            res["stroke-opacity"] = stroke.opacity;
        }
        res["stroke-width"] = stroke.width;
        if (stroke.dash != undefined) {
            res["stroke-dasharray"] = `${stroke.dash} ${stroke.dashSpace ?? stroke.dash}`;
        }
        res["stroke-linecap"] = stroke.lineCap;
        res["stroke-linejoin"] = stroke.lineJoin;
        res["stroke-miterlimit"] = stroke.miterLimit;
    }
    return res;
}

/**
 * SVG fill attributes
 */
export interface FillAttributes {
    fill: string;
    "fill-opacity"?: number;
}

/**
 * Extracts stroke style attributes
 *
 * @param model the model which provides the attributes
 * @returns the extracted attributes
 */
export function extractFillAttributes(model: Readonly<FilledElement>): FillAttributes {
    const res: FillAttributes = {
        fill: "none"
    };
    if (model.fill != undefined) {
        const fill = model.fill;
        res.fill = fill.color;
        if (fill.opacity != 1) {
            res["fill-opacity"] = fill.opacity;
        }
    }
    return res;
}

/**
 * SVG shape attributes, includes layout and stroke attributes
 */
export interface ShapeStyleAttributes extends StrokeAttributes, FillAttributes {}

/**
 * Extracts style properties for shapes
 *
 * @param model the model which provides the attributes
 * @returns the extracted attributes
 */
export function extractShapeStyleAttributes(model: Readonly<Shape>): ShapeStyleAttributes {
    return {
        ...extractStrokeAttriabutes(model),
        ...extractFillAttributes(model)
    };
}
