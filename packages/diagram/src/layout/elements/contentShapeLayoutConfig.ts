import { AttributeConfig, ContentCardinality, LayoutElement } from "../layoutElement.js";
import { ShapeLayoutConfig } from "./shapeLayoutConfig.js";
import { elementType } from "../../module/base/types.js";
import { FullObject } from "@hylimo/core";
import { Layout } from "../engine/layout.js";

/**
 * Base class for all shape layout configs with a content
 */
export abstract class ContentShapeLayoutConfig extends ShapeLayoutConfig {
    override contentType = elementType();
    override contentCardinality = ContentCardinality.Optional;

    /**
     * Creats a new ContentShapeLayoutconfig
     *
     * @param additionalAttributes additional non-style attributes
     * @param additionalStyleAttributes the supported additional style attributes
     */
    constructor(additionalAttributes: AttributeConfig[], additionalStyleAttributes: AttributeConfig[]) {
        super(additionalAttributes, additionalStyleAttributes);
    }

    override getChildren(layout: Layout, element: LayoutElement): FullObject[] {
        const content = element.element.getLocalFieldOrUndefined("content")?.value as FullObject | undefined;
        if (content != undefined) {
            return [content];
        }
        return [];
    }
}
