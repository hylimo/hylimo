import { Size } from "@hylimo/diagram-common";
import { AttributeConfig, ContentCardinality, LayoutElement, SizeConstraints } from "../../layoutElement.js";
import { Layout } from "../../engine/layout.js";
import { CanvasContentLayoutConfig } from "./canvasContentLayoutConfig.js";
import { FullObject, nullType } from "@hylimo/core";

/**
 * Base class for all point layout configs
 */
export abstract class CanvasPointLayoutConfig extends CanvasContentLayoutConfig {
    override isLayoutContent = true;

    /**
     * Creates a CanvasPointLayoutConfig
     *
     * @param additionalAttributes additional non-style attributes
     * @param styleAttributes the supported style attributes
     */
    constructor(additionalAttributes: AttributeConfig[], styleAttributes: AttributeConfig[]) {
        super(additionalAttributes, styleAttributes, nullType, ContentCardinality.None);
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        return constraints.min;
    }

    override getChildren(): FullObject[] {
        return [];
    }
}
