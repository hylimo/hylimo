import { ExecutableAbstractFunctionExpression, fun, numberType } from "@hylimo/core";
import { CanvasAxisAlignedSegment, Point, Size, Element, DefaultEditTypes } from "@hylimo/diagram-common";
import { LayoutElement } from "../../layoutElement.js";
import { Layout } from "../../layoutEngine.js";
import { CanvasConnectionSegmentLayoutConfig } from "./canvasConnectionSegmentLayoutConfig.js";

/**
 * Layout config for canvas line segments
 */
export class CanvasAxisAlignedSegmentLayoutConfig extends CanvasConnectionSegmentLayoutConfig {
    override type = CanvasAxisAlignedSegment.TYPE;

    constructor() {
        super(
            [
                {
                    name: "verticalPos",
                    description: "The position on the x-axis where the vertical segment starts",
                    type: numberType
                }
            ],
            []
        );
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const verticalPosFieldEntry = element.element.getLocalFieldOrUndefined("_verticalPos");
        const result: CanvasAxisAlignedSegment = {
            id,
            type: CanvasAxisAlignedSegment.TYPE,
            children: [],
            end: this.getContentId(element, "end"),
            pos: verticalPosFieldEntry?.value?.toNative(),
            edits: element.edits
        };
        return [result];
    }

    override createPrototype(): ExecutableAbstractFunctionExpression {
        return fun(
            `
                elementProto = object(proto = it)

                elementProto.defineProperty("verticalPos") {
                    args.self._verticalPos
                } {
                    args.self._verticalPos = it
                    args.self.edits.set("${DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS}", createReplaceEdit(it, "$string(pos)"))
                }
                
                elementProto
            `
        );
    }
}
