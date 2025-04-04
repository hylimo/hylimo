import type { FullObject } from "@hylimo/core";
import { nullType } from "@hylimo/core";
import type { Size } from "@hylimo/diagram-common";
import { canvasPointType } from "../../../module/base/types.js";
import type { AttributeConfig, LayoutElement, SizeConstraints } from "../../layoutElement.js";
import { ContentCardinality } from "../../layoutElement.js";
import type { Layout } from "../../engine/layout.js";
import { ElementLayoutConfig } from "../elementLayoutConfig.js";

/**
 * Base class for all canvas connection segment layout configs
 */
export abstract class CanvasConnectionSegmentLayoutConfig extends ElementLayoutConfig {
    /**
     * Creates a new CanvasConnectionSegmentLayoutConfig
     *
     * @param additionalAttributes additional non-style attributes
     * @param additionalStyleAttributes the supported style attributes
     */
    constructor(additionalAttributes: AttributeConfig[], additionalStyleAttributes: AttributeConfig[]) {
        super(
            [
                {
                    name: "end",
                    description: "The end point",
                    type: canvasPointType
                },
                ...additionalAttributes
            ],
            additionalStyleAttributes,
            nullType,
            ContentCardinality.None
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        return constraints.min;
    }

    override getChildren(): FullObject[] {
        return [];
    }

    /**
     * Gets the id of a point registered on the canvas
     *
     * @param layout the layout engine
     * @param element the current element, its parent must be a point provider (e.g. Canvas)
     * @param pointField the name of the field containing the point
     * @returns the id of the point
     */
    getContentId(layout: Layout, element: LayoutElement, pointField: string): string {
        const point = element.element.getLocalFieldOrUndefined(pointField)?.value;
        const pointId = layout.getElementId(point as FullObject);
        if (!layout.isChildElement(element.parent!.parent!, layout.layoutElementLookup.get(pointId)!)) {
            throw new Error(
                `The ${pointField} point of a ${this.type} must be part of the same canvas or a sub-canvas`
            );
        }
        return pointId;
    }
}
