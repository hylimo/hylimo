import { SChildElement, SShapeElement } from "sprotty";

export function extractLayoutAttributes(model: any): object {
    model as SShapeElement;
    return {
        x: model.x,
        y: model.y,
        width: model.width,
        height: model.height
    };
}

export function extractShapeAttributes(model: any): object {
    return {
        ...extractLayoutAttributes(model),
        fill: model.fill,
        fillOpacity: model.fillOpacity,
        stroke: model.stroke,
        strokeOpacity: model.strokeOpacity,
        strokeWidth: model.strokeWidth
    };
}
