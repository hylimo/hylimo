import { FullObject, RuntimeError, nullType } from "@hylimo/core";
import { Size } from "@hylimo/diagram-common";
import { canvasPointType } from "../../../module/base/types.js";
import { AttributeConfig, ContentCardinality, LayoutElement, SizeConstraints } from "../../layoutElement.js";
import { Layout } from "../../layoutEngine.js";
import { ElementLayoutConfig } from "../elementLayoutConfig.js";
import { CanvasContentLayoutConfig } from "./canvasContentLayoutConfig.js";

/**
 * Base class for all canvas connection segment layout configs
 */
export abstract class CanvasConnectionSegmentLayoutConfig extends ElementLayoutConfig {
    override contentType = nullType;
    override contentCardinality = ContentCardinality.None;

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
    getContentId(element: LayoutElement, pointField: string): string {
        const parent = element.parent;
        if (!parent || !(parent.layoutConfig as CanvasContentLayoutConfig).getContentId) {
            throw new RuntimeError("CanvasConnectionSegments can only be used as contents of a CanvasConnection");
        }
        const point = element.element.getLocalFieldOrUndefined(pointField)?.value;
        return (parent.layoutConfig as CanvasContentLayoutConfig).getContentId(element.parent!, point as FullObject);
    }
}
