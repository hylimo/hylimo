import { Element, Line, Point, Size } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../layoutElement.js";
import { Layout } from "../engine/layout.js";
import { BoxLayoutConfig, BoxOutlinePart } from "./boxLayoutConfig.js";

/**
 * Layout config for vbox
 */
export class VBoxLayoutConfig extends BoxLayoutConfig {
    override type = "vbox";

    constructor() {
        super();
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const contents = element.children;
        if (contents.length > 0) {
            let height = 0;
            let width = constraints.min.width;
            const contentElements: LayoutElement[] = [];
            contents.forEach((content, index) => {
                const contentConstraints: SizeConstraints = {
                    min: {
                        width: constraints.min.width,
                        height: index == contents.length - 1 ? constraints.min.height - height : 0
                    },
                    max: {
                        width: constraints.max.width,
                        height: constraints.max.height - height
                    }
                };
                const layoutedContent = layout.measure(content, contentConstraints);
                contentElements.push(layoutedContent);
                height += layoutedContent.measuredSize!.height;
                width = Math.max(width, layoutedContent.measuredSize!.width);
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
        let dy = 0;
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            const contentSize = {
                width: size.width,
                height: content.measuredSize!.height
            };
            if (i == contents.length - 1) {
                contentSize.height = Math.max(contentSize.height, size.height - dy);
            }
            const y = inverse ? position.y + size.height - dy - contentSize.height : position.y + dy;
            elements.push(...layout.layout(content, { x: position.x, y }, contentSize));
            dy += contentSize.height;
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
                primaryOffset: bounds.position.y,
                secondaryOffset: bounds.position.x,
                primaryLength: bounds.size.height,
                secondaryLength: bounds.size.width
            };
        });
        return this.computeOutlineFromParts(parts, id, (primary, secondary) => ({ x: secondary, y: primary }));
    }
}
