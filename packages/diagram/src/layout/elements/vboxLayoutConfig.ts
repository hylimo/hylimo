import { Element, Line, Point, Size } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../layoutElement.js";
import { Layout } from "../engine/layout.js";
import { BoxLayoutConfig, BoxOutlinePart } from "./boxLazoutConfig.js";

/**
 * Layout config for vbox
 */
export class VBoxLayoutConfig extends BoxLayoutConfig {
    override type = "vbox";

    constructor() {
        super();
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const contents = this.getContents(element);
        if (contents.length > 0) {
            let height = 0;
            let width = constraints.min.width;
            const contentElements: LayoutElement[] = [];
            const contentConstraints: SizeConstraints = {
                min: {
                    width: constraints.min.width,
                    height: 0
                },
                max: constraints.max
            };
            for (const content of contents) {
                const layoutedContent = layout.measure(content, element, contentConstraints);
                contentElements.push(layoutedContent);
                height += layoutedContent.measuredSize!.height;
                width = Math.max(width, layoutedContent.measuredSize!.width);
            }
            element.contents = contentElements;
            return { width, height };
        } else {
            element.contents = [];
            return constraints.min;
        }
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size): Element[] {
        const elements: Element[] = [];
        const contents = element.contents as LayoutElement[];
        let y = position.y;
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            const contentSize = {
                width: size.width,
                height: content.measuredSize!.height
            };
            if (i == contents.length - 1) {
                contentSize.height = Math.max(contentSize.height, position.y + size.height - y);
            }
            elements.push(...layout.layout(content, { x: position.x, y }, contentSize));
            y += contentSize.height;
        }
        return elements;
    }

    override outline(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Line {
        const contents = element.contents as LayoutElement[];
        if (contents.length < 2) {
            return super.outline(layout, element, position, size, id);
        }
        const parts: BoxOutlinePart[] = contents.map((content) => {
            const bounds = content.layoutBounds!;
            return {
                primaryOffset: bounds.position.y - position.y,
                secondaryOffset: bounds.position.x - position.x,
                primaryLength: bounds.size.height,
                secondaryLength: bounds.size.width
            };
        });
        return this.computeOutlineFromParts(parts, id, (primary, secondary) => ({ x: secondary, y: primary }));
    }
}
