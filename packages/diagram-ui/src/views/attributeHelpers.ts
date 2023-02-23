import { StrokedElement } from "@hylimo/diagram-common";
import { SLayoutedElement } from "../model/sLayoutedElement";
import { SShape } from "../model/sShape";

/**
 * Extracts layout attributes
 *
 * @param model the model which provides the attributes
 * @returns the extracted attribzutes
 */
export function extractLayoutAttributes(model: Readonly<SLayoutedElement>): {
    x: number;
    y: number;
    width: number;
    height: number;
} {
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
export function extractOutlinedShapeAttributes(model: Readonly<SShape>) {
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
 * Extracts stroke style attributes
 *
 * @param model the model which provides the attributes
 * @returns the extracted attributes
 */
export function extractStrokeAttriabutes(model: Readonly<StrokedElement>) {
    return {
        stroke: model.stroke ?? false,
        "stroke-opacity": model.strokeOpacity ?? false,
        "stroke-width": model.strokeWidth ?? false,
        "stroke-dasharray": model.strokeDash != undefined ? `${model.strokeDash} ${model.strokeDashSpace}` : false
    };
}

/**
 * Extracts layout and style properties for shapes
 *
 * @param model the model which provides the attributes
 * @returns the extracted attributes
 */
export function extractShapeAttributes(model: Readonly<SShape>) {
    const res = {
        ...extractLayoutAttributes(model),
        fill: model.fill ?? "none",
        "fill-opacity": model.fillOpacity,
        ...extractStrokeAttriabutes(model)
    };
    return res;
}
