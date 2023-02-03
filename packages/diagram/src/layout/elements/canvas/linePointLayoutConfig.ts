import { FullObject, literal, numberType, objectType, SemanticFieldNames } from "@hylimo/core";
import { Size, AbsolutePoint, Element, LinePoint } from "@hylimo/diagram-common";
import { Point } from "sprotty-protocol";
import { LayoutElement } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { CanvasPointLayoutConfig } from "./canvasPointLayoutConfig";

/**
 * Layout config for line points
 */
export class LinePointLayoutConfig extends CanvasPointLayoutConfig {
    constructor() {
        super(
            LinePoint.TYPE,
            [
                {
                    name: "pos",
                    description: "the relative offset on the line, must be between 0 and 1 (inclusive)",
                    type: numberType
                },
                {
                    name: "lineProvider",
                    description: "the target which provides the line",
                    type: objectType(
                        new Map([[SemanticFieldNames.PROTO, objectType(new Map([["_type", literal("element")]]))]])
                    )
                }
            ],
            []
        );
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const positionFieldEntry = element.element.getLocalFieldOrUndefined("pos");
        const lineProvider = this.getContentId(
            element,
            element.element.getLocalFieldOrUndefined("lineProvider")!.value as FullObject
        );
        const result: LinePoint = {
            type: LinePoint.TYPE,
            id,
            pos: Math.max(Math.min(positionFieldEntry?.value?.toNative(), 1), 0),
            lineProvider,
            editable: this.generateEditableNumbers(positionFieldEntry?.source),
            children: []
        };
        return [result];
    }
}
