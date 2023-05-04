import { Expression, FullObject, numberType, optional } from "@hylimo/core";
import { Size, Element, LinePoint, Point, CanvasConnection, CanvasElement } from "@hylimo/diagram-common";
import { LayoutElement } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { CanvasPointLayoutConfig } from "./canvasPointLayoutConfig";
import { elementType } from "../../../module/types";

/**
 * Layout config for line points
 */
export class LinePointLayoutConfig extends CanvasPointLayoutConfig {
    override type = LinePoint.TYPE;

    constructor() {
        super(
            [
                {
                    name: "pos",
                    description: "the relative offset on the line, must be between 0 and 1 (inclusive)",
                    type: numberType
                },
                {
                    name: "segment",
                    description:
                        "the segment to which pos is relative to, if not given, pos is calculated for the whole line",
                    type: optional(numberType)
                },
                {
                    name: "distance",
                    description: "the distance of the point to the line, defaults to 0",
                    type: optional(numberType)
                },
                {
                    name: "lineProvider",
                    description: "the target which provides the line",
                    type: elementType(CanvasConnection.TYPE, CanvasElement.TYPE)
                }
            ],
            []
        );
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const positionFieldEntry = element.element.getLocalFieldOrUndefined("pos");
        const distanceFieldEntry = element.element.getLocalFieldOrUndefined("distance");
        const segmentFieldEntry = element.element.getLocalFieldOrUndefined("segment");
        const lineProvider = this.getContentId(
            element,
            element.element.getLocalFieldOrUndefined("lineProvider")!.value as FullObject
        );
        const distance = distanceFieldEntry?.value?.toNative();
        const segment = segmentFieldEntry?.value?.toNative();
        const editableExpressions: Record<string, Expression | undefined> = {
            pos: positionFieldEntry?.source
        };
        if (distance != undefined) {
            editableExpressions.distance = distanceFieldEntry?.source;
        }
        if (segment != undefined) {
            editableExpressions.segment = segmentFieldEntry?.source;
        }
        const result: LinePoint = {
            type: LinePoint.TYPE,
            id,
            pos: Math.max(Math.min(positionFieldEntry?.value?.toNative(), 1), 0),
            distance,
            segment,
            lineProvider,
            editable: this.generateModificationSpecification(editableExpressions),
            children: []
        };
        return [result];
    }
}
