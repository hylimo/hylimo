import { Element, Point, Size } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../layoutElement";
import { Layout } from "../layoutEngine";
import { PanelLayoutConfig } from "./panelLayoutConfig";

/**
 * Layout config for hbox
 */
export class HBoxLayoutConfig extends PanelLayoutConfig {
    override type = "hbox";

    constructor() {
        super([], []);
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const contents = this.getContents(element);
        if (contents.length > 0) {
            let width = 0;
            let height = constraints.min.height;
            const contentElements: LayoutElement[] = [];
            const contentConstraints: SizeConstraints = {
                min: {
                    width: 0,
                    height: constraints.min.height
                },
                max: constraints.max
            };
            for (const content of contents) {
                const layoutedContent = layout.measure(content, element, contentConstraints);
                contentElements.push(layoutedContent);
                width += layoutedContent.measuredSize!.width;
                height = Math.max(height, layoutedContent.measuredSize!.height);
            }
            element.contents = contentElements;
            return { width, height };
        } else {
            element.contents = [];
            return constraints.min;
        }
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const elements: Element[] = [];
        const contents = element.contents as LayoutElement[];
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
            elements.push(...layout.layout(content, { x, y: position.y }, contentSize, `${id}_${i}`));
            x += contentSize.width;
        }
        return elements;
    }
}
