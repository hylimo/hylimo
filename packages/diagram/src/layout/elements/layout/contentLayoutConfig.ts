import type { LayoutElement } from "../../layoutElement.js";
import type { Point, Size, Line } from "@hylimo/diagram-common";
import type { Layout } from "../../engine/layout.js";
import { BaseLayoutConfig } from "../baseLayoutConfig.js";

/**
 * Base class for all layout configs which contain contents
 */
export abstract class ContentLayoutConfig extends BaseLayoutConfig {
    /**
     * What type of layout is supported
     */
    abstract readonly type: string;

    override outline(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Line {
        const contents = element.children;
        if (contents.length == 1) {
            return layout.outline(contents[0]);
        }
        return super.outline(layout, element, position, size, id);
    }
}
