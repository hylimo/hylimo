import type { Type } from "@hylimo/core";
import { listType, literal, namedType, objectType, or, stringType } from "@hylimo/core";
import {
    AbsolutePoint,
    Canvas,
    CanvasConnection,
    CanvasElement,
    Ellipse,
    LinePoint,
    Path,
    Rect,
    RelativePoint,
    Text
} from "@hylimo/diagram-common";

/**
 * Function which creates an element type
 *
 * @param elements the allowed elements, if none are provided, all elements are allowed
 * @returns the generated type
 */
export function elementType(...elements: string[]): Type {
    const fields: Map<string, Type> = new Map();
    fields.set("_type", literal("element"));
    if (elements.length > 0) {
        fields.set("type", or(...elements.map((element) => literal(element))));
    }
    return namedType(objectType(fields), elements.join(" | ") || "element");
}

/**
 * Type for any type of point
 */
export const canvasPointType = elementType(AbsolutePoint.TYPE, RelativePoint.TYPE, LinePoint.TYPE);

/**
 * Type for any type of canvas element
 */
export const canvasContentType = elementType(
    CanvasConnection.TYPE,
    CanvasElement.TYPE,
    AbsolutePoint.TYPE,
    RelativePoint.TYPE,
    LinePoint.TYPE
);

/**
 * Type for any simple element which can e.g. be used inside a rect or container
 */
export const simpleElementType = elementType(Canvas.TYPE, Text.TYPE, Rect.TYPE, Ellipse.TYPE, Path.TYPE, "container");

/**
 * Type for either a string or a list of span elements
 */
export const stringOrSpanListType = or(stringType, listType(elementType("span")));
