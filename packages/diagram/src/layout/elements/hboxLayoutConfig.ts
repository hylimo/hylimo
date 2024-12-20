import { Element, Line, Point, Size } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../layoutElement.js";
import { Layout } from "../engine/layout.js";
import { BoxLayoutConfig, BoxOutlinePart } from "./boxLayoutConfig.js";

/**
 * Layout config for hbox
 */
export class HBoxLayoutConfig extends BoxLayoutConfig {
    override type = "hbox";

    constructor() {
        super();
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const contents = element.children;
        if (contents.length > 0) {
            let width = 0;
            let height = constraints.min.height;
            const contentElements: LayoutElement[] = [];
            const minConstraints = {
                width: 0,
                height: constraints.min.height
            };
            for (const content of contents) {
                const contentConstraints: SizeConstraints = {
                    min: minConstraints,
                    max: {
                        width: constraints.max.width - width,
                        height: constraints.max.height
                    }
                };
                const layoutedContent = layout.measure(content, contentConstraints);
                contentElements.push(layoutedContent);
                width += layoutedContent.measuredSize!.width;
                height = Math.max(height, layoutedContent.measuredSize!.height);
            }
            return { width, height };
        } else {
            return constraints.min;
        }
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size): Element[] {
        const elements: Element[] = [];
        const contents = element.children;
        let x = position.x;
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            const contentSize = {
                width: content.measuredSize!.width,
                height: size.height
            };
            if (i == contents.length - 1) {
                contentSize.width = Math.max(contentSize.width, position.x + size.width - x);
            }
            elements.push(...layout.layout(content, { x, y: position.y }, contentSize));
            x += contentSize.width;
        }
        return elements;
    }

    override outline(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Line {
        const contents = element.children;
        if (contents.length < 2) {
            return super.outline(layout, element, position, size, id);
        }
        const parts: BoxOutlinePart[] = contents.map((content) => {
            const bounds = content.layoutBounds!;
            return {
                primaryOffset: bounds.position.x,
                secondaryOffset: bounds.position.y,
                primaryLength: bounds.size.width,
                secondaryLength: bounds.size.height
            };
        });
        return this.computeOutlineFromParts(parts, id, (primary, secondary) => ({ x: primary, y: secondary }));
    }
}
