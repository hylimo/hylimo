import type { Element, Line, Point, Size } from "@hylimo/diagram-common";
import type { LayoutElement, SizeConstraints } from "../layoutElement.js";
import type { Layout } from "../engine/layout.js";
import type { BoxOutlinePart } from "./boxLayoutConfig.js";
import { BoxLayoutConfig } from "./boxLayoutConfig.js";

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
            contents.forEach((content, index) => {
                const contentConstraints: SizeConstraints = {
                    min: {
                        width: index == contents.length - 1 ? constraints.min.width - width : 0,
                        height: constraints.min.height
                    },
                    max: {
                        width: constraints.max.width - width,
                        height: constraints.max.height
                    }
                };
                const layoutedContent = layout.measure(content, contentConstraints);
                contentElements.push(layoutedContent);
                width += layoutedContent.measuredSize!.width;
                height = Math.max(height, layoutedContent.measuredSize!.height);
            });
            return { width, height };
        } else {
            return constraints.min;
        }
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size): Element[] {
        const elements: Element[] = [];
        const contents = element.children;
        const inverse = element.styles.inverse ?? false;
        let dx = 0;
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            const contentSize = {
                width: content.measuredSize!.width,
                height: size.height
            };
            if (i == contents.length - 1) {
                contentSize.width = Math.max(contentSize.width, size.width - dx);
            }
            const x = inverse ? position.x + size.width - dx - contentSize.width : position.x + dx;
            elements.push(...layout.layout(content, { x, y: position.y }, contentSize));
            dx += contentSize.width;
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
