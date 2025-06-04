import type { AttributeConfig, LayoutElement } from "../layoutElement.js";
import { ContentCardinality } from "../layoutElement.js";
import { ShapeLayoutConfig } from "./shapeLayoutConfig.js";
import { simpleElementType } from "../../module/base/types.js";
import { objectToList, type FullObject } from "@hylimo/core";
import { containerStyleAttributes } from "./attributes.js";

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
        super(
            additionalAttributes,
            [...additionalStyleAttributes, ...containerStyleAttributes],
            simpleElementType,
            ContentCardinality.Many
        );
    }

    override getChildren(element: LayoutElement): FullObject[] {
        const contents = element.element.getLocalFieldOrUndefined("contents")?.value as FullObject | undefined;
        if (contents) {
            return objectToList(contents) as FullObject[];
        } else {
            return [];
        }
    }
}
