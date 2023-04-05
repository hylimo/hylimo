import { Size, Point, Element } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../layoutElement";
import { Layout } from "../layoutEngine";
import { PanelLayoutConfig } from "./panelLayoutConfig";

/**
 * Layout config for stack
 */
export class StackLayoutConfig extends PanelLayoutConfig {
    constructor() {
        super("stack", [], []);
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const contents = this.getContents(element);
        if (contents.length > 0) {
            let height = constraints.min.height;
            let width = constraints.min.width;
            const contentElements: LayoutElement[] = [];
            for (const content of contents) {
                const layoutedContent = layout.measure(content, element, constraints);
                contentElements.push(layoutedContent);
                const contentSize = layoutedContent.measuredSize!;
                width = Math.max(width, contentSize.width);
                height = Math.max(height, contentSize.height);
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
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            elements.push(...layout.layout(content, position, size, `${id}_${i}`));
        }
        return elements;
    }
}
