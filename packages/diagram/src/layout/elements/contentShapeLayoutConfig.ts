import type { AttributeConfig, LayoutElement } from "../layoutElement.js";
import { ContentCardinality } from "../layoutElement.js";
import { BaseShapeLayoutConfig } from "./baseShapeLayoutConfig.js";
import { simpleElementType } from "../../module/base/types.js";
import { objectToList, type FullObject, type Type } from "@hylimo/core";
import { containerStyleAttributes } from "./attributes.js";

/**
 * Base class for all shape layout configs with a content
 */
export abstract class ContentShapeLayoutConfig extends BaseShapeLayoutConfig {
    /**
     * Creats a new ContentShapeLayoutconfig
     *
     * @param additionalAttributes additional non-style attributes
     * @param additionalStyleAttributes the supported additional style attributes
     * @param contentType what the contents may hold, defaulting to the usual simple elements
     */
    constructor(
        additionalAttributes: AttributeConfig[],
        additionalStyleAttributes: AttributeConfig[],
        contentType: Type = simpleElementType
    ) {
        super(
            additionalAttributes,
            [...additionalStyleAttributes, ...containerStyleAttributes],
            contentType,
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
