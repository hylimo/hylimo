/**
 * Extracts layout attributes
 *
 * @param model the model which provides the attributes
 * @returns the extracted attribzutes
 */
export function extractLayoutAttributes(model: any): { x: number; y: number; width: number; height: number } {
    return {
        x: model.x,
        y: model.y,
        width: model.width,
        height: model.height
    };
}

/**
 * Extracts layout and style properties for shapes
 *
 * @param model the model which provides the attributes
 * @returns the extracted attributes
 */
export function extractShapeAttributes(model: any): object {
    const res = {
        ...extractLayoutAttributes(model),
        fill: model.fill ?? "none",
        "fill-opacity": model.fillOpacity,
        stroke: model.stroke,
        "stroke-opacity": model.strokeOpacity,
        "stroke-width": model.strokeWidth
    };
    if (model.strokeWidth) {
        res.x += model.strokeWidth / 2;
        res.y += model.strokeWidth / 2;
        res.width = Math.max(0, res.width - model.strokeWidth);
        res.height = Math.max(0, res.height - model.strokeWidth);
    }
    return res;
}
