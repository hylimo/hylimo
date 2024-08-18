import { ExecutableAbstractFunctionExpression, Expression, FullObject, fun, numberType, optional } from "@hylimo/core";
import { Size, Element, LinePoint, Point, CanvasConnection, CanvasElement } from "@hylimo/diagram-common";
import { LayoutElement } from "../../layoutElement.js";
import { Layout } from "../../layoutEngine.js";
import { CanvasPointLayoutConfig } from "./canvasPointLayoutConfig.js";
import { elementType } from "../../../module/types.js";

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
        const positionFieldEntry = element.element.getLocalFieldOrUndefined("_pos");
        const distanceFieldEntry = element.element.getLocalFieldOrUndefined("_distance");
        const segmentFieldEntry = element.element.getLocalFieldOrUndefined("_segment");
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

    override createPrototype(): ExecutableAbstractFunctionExpression {
        return fun(
            `
                elementProto = object(proto = it)

                elementProto.defineProperty("pos") {
                    args.self._pos
                } {
                    args.self._pos = it
                }
                elementProto.defineProperty("distance") {
                    args.self._distance
                } {
                    args.self._distance = it
                }
                elementProto.defineProperty("segment") {
                    args.self._segment
                } {
                    args.self._segment = it
                }
                
                elementProto
            `
        );
    }
}
