import type { ExecutableAbstractFunctionExpression, FullObject } from "@hylimo/core";
import { assertNumber, assertObject, fun, isNumber, numberType, objectType, or } from "@hylimo/core";
import type { Size, Element, Point } from "@hylimo/diagram-common";
import { LinePoint, CanvasConnection, CanvasElement, DefaultEditTypes } from "@hylimo/diagram-common";
import type { LayoutElement } from "../../layoutElement.js";
import type { Layout } from "../../engine/layout.js";
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
    override idGroup = "pl";

    constructor() {
        super(
            [
                {
                    name: "lineProvider",
                    description: "the target which provides the line",
                    type: elementType(CanvasConnection.TYPE, CanvasElement.TYPE)
                }
            ],
            [
                {
                    name: "pos",
                    description: "the relative offset on the line, must be between 0 and 1 (inclusive)",
                    type: LinePointLayoutConfig.POS_TYPE
                },
                {
                    name: "distance",
                    description: "the distance of the point to the line, defaults to 0",
                    type: numberType
                }
            ]
        );
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const positionField = element.element.getLocalFieldOrUndefined("_pos")?.value;
        const distanceValue = element.element.getLocalFieldOrUndefined("_distance");
        const lineProvider = layout.getElementId(
            element.element.getLocalFieldOrUndefined("lineProvider")!.value as FullObject
        );
        if (!layout.isChildElement(element.parent!, layout.layoutElementLookup.get(lineProvider)!)) {
            throw new Error("The lineProvider of a line point must be part of the same canvas or a sub-canvas");
        }
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
                elementProto = [proto = it]

                elementProto.defineProperty("pos") {
                    args.self._pos
                } {
                    args.self._pos = it
                    args.self.edits["${DefaultEditTypes.MOVE_LPOS_POS}"] = createReplaceEdit(it, "$replace($string(pos), ',', ', ')")
                }
                elementProto.defineProperty("distance") {
                    args.self._distance
                } {
                    args.self._distance = it
                    args.self.edits["${DefaultEditTypes.MOVE_LPOS_DIST}"] = createReplaceEdit(it, "$string(dist)")
                }
                
                elementProto
            `
        );
    }
}
