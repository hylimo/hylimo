import { SChildElement, SShapeElement } from "sprotty";

export function extractLayoutAttributes(model: any): object {
    model as SShapeElement
    return {
        x: model.position.x,
        y: model.position.y,
        width: model.size.width,
        height: model.size.height
    }
}

export function extractShapeAttributes(model: any): object {
    return {
        ...extractLayoutAttributes(model),
        fill: model.fill,
        fillOpacity: model.fillOpacity,
        stroke: model.stroke,
        strokeOpacity: model.strokeOpacity,
        strokeWidth: model.strokeWidth
    }
}