import { FullObject, numberType } from "@hylimo/core";
import { Element, Size, Rect, Point, Line, ArcSegment, LineSegment } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints, addToConstraints, addToSize } from "../layoutElement";
import { Layout } from "../layoutEngine";
import { ContentShapeLayoutConfig } from "./contentShapeLayoutConfig";

/**
 * Layout config for rect
 */
export class RectLayoutConfig extends ContentShapeLayoutConfig {
    override type = Rect.TYPE;

    constructor() {
        super(
            [],
            [
                {
                    name: "cornerRadius",
                    description: "optional corner radius for all for corner in both x and y direction",
                    type: numberType
                }
            ]
        );
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
        let cornerRadius: number | undefined = undefined;
        if (element.styles.cornerRadius) {
            cornerRadius = Math.max(0, Math.min(element.styles.cornerRadius, size.width / 2, size.height / 2));
        }
        element.cornerRadius = cornerRadius;
        const result: Rect = {
            type: Rect.TYPE,
            id,
            ...position,
            ...size,
            ...this.extractShapeProperties(element),
            cornerRadius,
            children: []
        };
        if (element.content) {
            let contentSize = size;
            let contentPosition = position;
            const strokeWidth = result.stroke?.width;
            if (strokeWidth) {
                contentSize = addToSize(contentSize, -2 * strokeWidth, -2 * strokeWidth);
                contentPosition = { x: position.x + strokeWidth, y: position.y + strokeWidth };
            }
            result.children.push(...layout.layout(element.content, contentPosition, contentSize, `${id}_0`));
        }
        return [result];
    }

    override outline(layout: Layout, element: LayoutElement, position: Point, size: Size): Line {
        if (element.cornerRadius) {
            const radius: number = element.cornerRadius;
            const { x, y } = position;
            const { width, height } = size;
            const startPos = {
                x: x + width,
                y: y + height / 2
            };
            const segments: (LineSegment | ArcSegment)[] = [
                this.lineSegment(x + width, y + height - radius),
                this.arcSegment(x + width - radius, y + height - radius, x + width - radius, y + height, radius),
                this.lineSegment(x + width / 2, y + height),
                this.lineSegment(x + radius, y + height),
                this.arcSegment(x + radius, y + height - radius, x, y + height - radius, radius),
                this.lineSegment(x, y + height / 2),
                this.lineSegment(x, y + radius),
                this.arcSegment(x + radius, y + radius, x + radius, y, radius),
                this.lineSegment(x + width / 2, y),
                this.lineSegment(x + width - radius, y),
                this.arcSegment(x + width - radius, y + radius, x + width, y + radius, radius),
                this.lineSegment(startPos.x, startPos.y)
            ];
            return {
                start: startPos,
                segments
            };
        } else {
            return super.outline(layout, element, position, size);
        }
    }
}
