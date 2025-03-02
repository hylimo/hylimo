import type { AttributeConfig, LayoutElement } from "../layoutElement.js";
import { ContentCardinality } from "../layoutElement.js";
import { ShapeLayoutConfig } from "./shapeLayoutConfig.js";
import { simpleElementType } from "../../module/base/types.js";
import type { FullObject } from "@hylimo/core";

/**
 * Base class for all shape layout configs with a content
 */
export abstract class ContentShapeLayoutConfig extends ShapeLayoutConfig {
    /**
     * Creats a new ContentShapeLayoutconfig
     *
     * @param additionalAttributes additional non-style attributes
     * @param additionalStyleAttributes the supported additional style attributes
     */
    constructor(additionalAttributes: AttributeConfig[], additionalStyleAttributes: AttributeConfig[]) {
        super(additionalAttributes, additionalStyleAttributes, simpleElementType, ContentCardinality.Optional);
    }

    override getChildren(element: LayoutElement): FullObject[] {
        const content = element.element.getLocalFieldOrUndefined("content")?.value as FullObject | undefined;
        if (content != undefined) {
            return [content];
        }
        return [];
    }
}
