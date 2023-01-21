import { FullObject, literal, objectToList, objectType, optional, or, SemanticFieldNames } from "@hylimo/core";
import { listType } from "@hylimo/core/src/types/list";
import { Size, Point, Element, CanvasConnection, Marker } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { CanvasContentLayoutConfig } from "./canvasContentLayoutConfig";

/**
 * Type for start and end marker
 */
const markerType = optional(
    objectType(
        new Map([
            [SemanticFieldNames.PROTO, objectType(new Map([["_type", literal("element")]]))],
            ["type", literal(Marker.TYPE)]
        ])
    )
);

/**
 * Layout config or CanvasConnection
 */
export class CanvasConnectionLayoutConfig extends CanvasContentLayoutConfig {
    override isLayoutContent = false;

    constructor() {
        super(
            CanvasConnection.TYPE,
            [
                {
                    name: "contents",
                    description: "the inner elements",
                    type: listType(
                        objectType(
                            new Map([[SemanticFieldNames.PROTO, objectType(new Map([["_type", literal("element")]]))]])
                        )
                    )
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
                }
            ],
            []
        );
    }
    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        // TODO (maybe) better size calculation
        const contents = this.getContents(element);
        element.contents = contents.map((content) => layout.measure(content, element, constraints));
        const startMarker = element.element.getLocalFieldOrUndefined("startMarker")?.value;
        if (startMarker != undefined) {
            element.startMarker = layout.measure(startMarker as FullObject, element, constraints);
        }
        const endMarker = element.element.getLocalFieldOrUndefined("endMarker")?.value;
        if (endMarker != undefined) {
            element.endMarker = layout.measure(endMarker as FullObject, element, constraints);
        }
        return constraints.min;
    }
    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const contents = element.contents as LayoutElement[];
        const result: CanvasConnection = {
            id,
            type: CanvasConnection.TYPE,
            children: contents.flatMap((content, i) =>
                layout.layout(content, position, content.measuredSize!, `${id}_${i}`)
            )
        };
        const startMarker = element.startMarker;
        if (element.startMarker != undefined) {
            result.startMarker = layout.layout(startMarker, position, startMarker.measureSize, `${id}_s`)[0] as Marker;
        }
        const endMarker = element.endMarker;
        if (element.endMarker != undefined) {
            result.endMarker = layout.layout(endMarker, position, endMarker.measureSize, `${id}_e`)[0] as Marker;
        }
        return [result];
    }

    /**
     * Gets the contents of a panel
     *
     * @param element the element containing the contents
     * @returns the contents
     */
    private getContents(element: LayoutElement): FullObject[] {
        const contents = element.element.getLocalFieldOrUndefined("contents")?.value as FullObject | undefined;
        if (contents) {
            return objectToList(contents) as FullObject[];
        } else {
            return [];
        }
    }
}
