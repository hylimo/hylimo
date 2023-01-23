import { FullObject, literal, objectToList, objectType, optional, listType, SemanticFieldNames } from "@hylimo/core";
import { Size, Point, Element, CanvasConnection, Marker } from "@hylimo/diagram-common";
import { canvasPointType } from "../../../module/types";
import { LayoutElement, SizeConstraints } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { strokeStyleAttributes } from "../attributes";
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
        const contents = this.getContents(element);
        element.contents = contents.map((content) => layout.measure(content, element, constraints));
        const startMarker = element.element.getLocalFieldOrUndefined("startMarker")?.value;
        if (startMarker != undefined) {
            element.startMarker = layout.measure(startMarker as FullObject, element, constraints);
            element.startMarker.position = "start";
        }
        const endMarker = element.element.getLocalFieldOrUndefined("endMarker")?.value;
        if (endMarker != undefined) {
            element.endMarker = layout.measure(endMarker as FullObject, element, constraints);
            element.endMarker.position = "end";
        }
        return constraints.min;
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const contents = element.contents as LayoutElement[];
        const result: CanvasConnection = {
            id,
            type: CanvasConnection.TYPE,
            start: this.getContentId(element, element.element.getLocalFieldOrUndefined("start")!.value as FullObject),
            children: contents.flatMap((content, i) =>
                layout.layout(content, position, content.measuredSize!, `${id}_${i}`)
            ),
            stroke: element.styles.stroke,
            strokeOpacity: element.styles.strokeOpacity,
            strokeWidth: element.styles.strokeWidth
        };
        const startMarker = element.startMarker;
        if (element.startMarker != undefined) {
            const marker = layout.layout(startMarker, position, startMarker.measuredSize, `${id}_s`)[0] as Marker;
            result.children.push(marker);
        }
        const endMarker = element.endMarker;
        if (element.endMarker != undefined) {
            const marker = layout.layout(endMarker, position, endMarker.measuredSize, `${id}_e`)[0] as Marker;
            result.children.push(marker);
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
