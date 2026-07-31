import type { Type } from "@hylimo/core";
import { listType, literal, namedType, objectType, or, stringType } from "@hylimo/core";
import {
    AbsolutePoint,
    Canvas,
    CanvasConnection,
    CanvasElement,
    LinePoint,
    Path,
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
export const simpleElementType = elementType(Canvas.TYPE, Text.TYPE, "shape", Path.TYPE, "container");

/**
 * Type for the contents of a shape: everything {@link simpleElementType} allows, plus `divider`.
 *
 * That extra entry is the whole of the containment rule for dividers. Because no other content type
 * admits one — `container`'s in particular does not — a divider anywhere but *directly* inside a
 * shape is a type error, so "direct child of a shape" needs no validation of its own.
 */
export const shapeContentType = elementType(Canvas.TYPE, Text.TYPE, "shape", Path.TYPE, "container", "divider");

/**
 * Type for either a string or a list of span elements
 */
export const stringOrSpanListType = or(stringType, listType(elementType("span")));
