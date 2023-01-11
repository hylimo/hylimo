import { FullObject } from "@hylimo/core";
import { Element, Size, Rect, Point } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints, addToConstraints, addToSize } from "../layoutElement";
import { Layout } from "../layoutEngine";
import { ContentShapeLayoutConfig } from "./contentShapeLayoutConfig";

/**
 * Layout config for rect
 */
export class RectLayoutConfig extends ContentShapeLayoutConfig {
    constructor() {
        super(Rect.TYPE, [], []);
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        this.normalizeStrokeWidth(element);
        const strokeWidth = element.styles.strokeWidth;
        const content = element.element.getLocalFieldOrUndefined("content")?.value as FullObject | undefined;
        if (content) {
            const contentElement = layout.measure(
                content,
                element,
                addToConstraints(constraints, -2 * strokeWidth, -2 * strokeWidth)
            );
            element.content = contentElement;
            const size = addToSize(contentElement.measuredSize!, 2 * strokeWidth, 2 * strokeWidth);
            return size;
        } else {
            return constraints.min;
        }
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const result: Rect = {
            type: Rect.TYPE,
            id,
            ...position,
            ...size,
            ...this.extractShapeProperties(element),
            children: []
        };
        if (element.content) {
            let contentSize = size;
            let contentPosition = position;
            if (result.strokeWidth) {
                contentSize = addToSize(contentSize, -2 * result.strokeWidth, -2 * result.strokeWidth);
                contentPosition = { x: position.x + result.strokeWidth, y: position.y + result.strokeWidth };
            }
            result.children.push(...layout.layout(element.content, contentPosition, contentSize, `${id}_0`));
        }
        return [result];
    }
}
