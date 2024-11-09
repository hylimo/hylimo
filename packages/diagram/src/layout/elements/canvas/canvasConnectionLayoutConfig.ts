import { FullObject, objectToList, optional, listType } from "@hylimo/core";
import {
    Size,
    Point,
    Element,
    CanvasConnection,
    Marker,
    CanvasBezierSegment,
    CanvasLineSegment,
    CanvasAxisAlignedSegment
} from "@hylimo/diagram-common";
import { canvasPointType, elementType } from "../../../module/base/types.js";
import { ContentCardinality, LayoutElement, SizeConstraints } from "../../layoutElement.js";
import { Layout } from "../../engine/layout.js";
import { extractStrokeStyleAttributes, strokeStyleAttributes } from "../attributes.js";
import { EditableCanvasContentLayoutConfig } from "./editableCanvasContentLayoutConfig.js";

/**
 * Type for start and end marker
 */
const markerType = optional(elementType(Marker.TYPE));

/**
 * Layout config or CanvasConnection
 */
export class CanvasConnectionLayoutConfig extends EditableCanvasContentLayoutConfig {
    override isLayoutContent = false;
    override type = CanvasConnection.TYPE;
    override contentType = elementType(
        CanvasBezierSegment.TYPE,
        CanvasLineSegment.TYPE,
        CanvasAxisAlignedSegment.TYPE,
        Marker.TYPE
    );
    override contentCardinality = ContentCardinality.AtLeastOne;

    constructor() {
        super(
            [
                {
                    name: "contents",
                    description: "the inner elements",
                    type: listType(elementType())
                },
                {
                    name: "startMarker",
                    description: "the marker at the start of the connection",
                    type: markerType
                },
                {
                    name: "endMarker",
                    description: "the marker at the end of the connection",
                    type: markerType
                },
                {
                    name: "start",
                    description: "The start point",
                    type: canvasPointType
                }
            ],
            [...strokeStyleAttributes]
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        // TODO (maybe) better size calculation
        for (const content of element.children) {
            layout.measure(content, constraints);
        }
        return constraints.min;
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const contents = element.children;
        const result: CanvasConnection = {
            id,
            type: CanvasConnection.TYPE,
            start: layout.getElementId(element.element.getLocalFieldOrUndefined("start")!.value as FullObject),
            children: contents
                .filter((content) => content.layoutConfig.type != Marker.TYPE)
                .flatMap((content) => layout.layout(content, position, content.measuredSize!)),
            ...extractStrokeStyleAttributes(element.styles),
            edits: element.edits
        };
        const contentLookup = new Map(contents.map((content) => [content.element, content]));
        if (element.startMarker != undefined) {
            const startMarker = contentLookup.get(element.startMarker)!;
            startMarker.position = "start";
            const marker = layout.layout(startMarker, position, startMarker.measuredSize!)[0] as Marker;
            result.children.push(marker);
        }
        if (element.endMarker != undefined) {
            const endMarker = contentLookup.get(element.endMarker)!;
            endMarker.position = "end";
            const marker = layout.layout(endMarker, position, endMarker.measuredSize!)[0] as Marker;
            result.children.push(marker);
        }
        return [result];
    }

    override getChildren(element: LayoutElement): FullObject[] {
        const children: FullObject[] = [];
        const contents = element.element.getLocalFieldOrUndefined("contents")?.value as FullObject | undefined;
        if (contents) {
            children.push(...(objectToList(contents) as FullObject[]));
        }
        const startMarker = element.element.getLocalFieldOrUndefined("startMarker")?.value;
        if (startMarker != undefined) {
            element.startMarker = startMarker;
            children.push(startMarker as FullObject);
        }
        const endMarker = element.element.getLocalFieldOrUndefined("endMarker")?.value;
        if (endMarker != undefined) {
            element.endMarker = endMarker;
            children.push(endMarker as FullObject);
        }
        return children;
    }
}
