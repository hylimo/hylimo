import { Size } from "@hylimo/diagram-common";
import { ContentCardinality, LayoutElement, SizeConstraints } from "../../layoutElement.js";
import { Layout } from "../../engine/layout.js";
import { CanvasContentLayoutConfig } from "./canvasContentLayoutConfig.js";
import { FullObject, nullType } from "@hylimo/core";

/**
 * Base class for all point layout configs
 */
export abstract class CanvasPointLayoutConfig extends CanvasContentLayoutConfig {
    override isLayoutContent = true;
    override contentType = nullType;
    override contentCardinality = ContentCardinality.None;

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        return constraints.min;
    }

    override getChildren(): FullObject[] {
        return [];
    }
}
