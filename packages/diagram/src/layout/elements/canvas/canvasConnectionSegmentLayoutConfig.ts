import { FullObject, RuntimeError } from "@hylimo/core";
import { Size } from "@hylimo/diagram-common";
import { canvasPointType } from "../../../module/diagramModule";
import { AttributeConfig, LayoutElement, SizeConstraints } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { ElementLayoutConfig } from "../elementLayoutConfig";

/**
 * Base class for all canvas connection segment layout configs
 */
export abstract class CanvasConnectionSegmentLayoutConfig extends ElementLayoutConfig {
    /**
     * Creates a new CanvasConnectionSegmentLayoutConfig
     *
     * @param type the supported type
     * @param additionalAttributes additional non-style attributes
     * @param additionalStyleAttributes the supported style attributes
     */
    constructor(type: string, additionalAttributes: AttributeConfig[], additionalStyleAttributes: AttributeConfig[]) {
        super(
            type,
            [
                {
                    name: "start",
                    description: "The start point",
                    type: canvasPointType
                },
                {
                    name: "end",
                    description: "The end point",
                    type: canvasPointType
                },
                ...additionalAttributes
            ],
            additionalStyleAttributes
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        return constraints.min;
    }

    /**
     * Gets the id of a point registered on the canvas
     *
     * @param element the current element, its parent must be a point provider (e.g. Canvas)
     * @param pointField the name of the field containing the point
     * @returns the id of the point
     */
    getPoint(element: LayoutElement, pointField: string): string {
        const parent = element.parent;
        if (!parent || !parent.getPoint) {
            throw new RuntimeError("CanvasConnections and CanvasElements can only be used as contents of a Canvas");
        }
        const point = element.element.getLocalFieldOrUndefined(pointField)?.value;
        return parent.getPoint(element, point);
    }
}
