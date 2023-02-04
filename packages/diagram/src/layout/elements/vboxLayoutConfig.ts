import { Element, Point, Size } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../layoutElement";
import { Layout } from "../layoutEngine";
import { PanelLayoutConfig } from "./panelLayoutConfig";

/**
 * Layout config for vbox
 */
export class VBoxLayoutConfig extends PanelLayoutConfig {
    constructor() {
        super("vbox", [], []);
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

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
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
            elements.push(...layout.layout(content, { x: position.x, y }, contentSize, `${id}_${i}`));
            y += contentSize.height;
        }
        return elements;
    }
}
