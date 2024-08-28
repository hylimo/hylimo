import {
    assertNumber,
    assertObject,
    ExecutableAbstractFunctionExpression,
    FullObject,
    fun,
    isNumber,
    numberType,
    objectType,
    optional,
    or
} from "@hylimo/core";
import {
    Size,
    Element,
    LinePoint,
    Point,
    CanvasConnection,
    CanvasElement,
    DefaultEditTypes
} from "@hylimo/diagram-common";
import { LayoutElement } from "../../layoutElement.js";
import { Layout } from "../../layoutEngine.js";
import { CanvasPointLayoutConfig } from "./canvasPointLayoutConfig.js";
import { elementType } from "../../../module/base/types.js";

/**
 * Layout config for line points
 */
export class LinePointLayoutConfig extends CanvasPointLayoutConfig {
    /**
     * The type of the pos field
     */
    static POS_TYPE = or(
        numberType,
        objectType(
            new Map([
                [0, numberType],
                [1, numberType]
            ])
        )
    );

    override type = LinePoint.TYPE;

    constructor() {
        super(
            [
                {
                    name: "pos",
                    description: "the relative offset on the line, must be between 0 and 1 (inclusive)",
                    type: optional(LinePointLayoutConfig.POS_TYPE)
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
        const positionField = element.element.getLocalFieldOrUndefined("_pos")?.value;
        const distanceValue = element.element.getLocalFieldOrUndefined("_distance");
        const lineProvider = this.getContentId(
            element,
            element.element.getLocalFieldOrUndefined("lineProvider")!.value as FullObject
        );
        let pos: number;
        let segment: number | undefined;
        if (positionField == undefined) {
            pos = 0;
            segment = undefined;
        } else if (isNumber(positionField)) {
            pos = positionField.value;
            segment = undefined;
        } else {
            assertObject(positionField);
            segment = assertNumber(positionField.getLocalFieldOrUndefined(0)!.value);
            pos = assertNumber(positionField.getLocalFieldOrUndefined(1)!.value);
        }
        const distance = distanceValue?.value?.toNative();
        const result: LinePoint = {
            type: LinePoint.TYPE,
            id,
            pos: Math.max(Math.min(pos, 1), 0),
            distance,
            segment,
            lineProvider,
            children: [],
            edits: element.edits
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
                    args.self.edits.set("${DefaultEditTypes.MOVE_LPOS_POS}", createReplaceEdit(it, "$replace($string(pos), ',', ', ')"))
                }
                elementProto.defineProperty("distance") {
                    args.self._distance
                } {
                    args.self._distance = it
                    args.self.edits.set("${DefaultEditTypes.MOVE_LPOS_DIST}", createReplaceEdit(it, "$string(dist)"))
                }
                
                elementProto
            `
        );
    }
}
