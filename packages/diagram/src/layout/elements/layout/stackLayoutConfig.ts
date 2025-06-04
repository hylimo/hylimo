import type { Size, Point, Element } from "@hylimo/diagram-common";
import type { LayoutElement, SizeConstraints } from "../../layoutElement.js";
import type { Layout } from "../../engine/layout.js";
import { ContentLayoutConfig } from "./contentLayoutConfig.js";

/**
 * Layout config for stack
 */
export class StackLayoutConfig extends ContentLayoutConfig {
    override type = "stack";

    constructor() {
        super();
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const contents = element.children;
        if (contents.length > 0) {
            let height = constraints.min.height;
            let width = constraints.min.width;
            const contentElements: LayoutElement[] = [];
            for (const content of contents) {
                const contentSize = layout.measure(content, constraints);
                contentElements.push(content);
                width = Math.max(width, contentSize.width);
                height = Math.max(height, contentSize.height);
            }
            return { width, height };
        } else {
            return constraints.min;
        }
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size): Element[] {
        const elements: Element[] = [];
        const contents = element.children;
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            elements.push(...layout.layout(content, position, size));
        }
        return elements;
    }
}
