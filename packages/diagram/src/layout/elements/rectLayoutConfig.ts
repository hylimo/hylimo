import { FullObject, numberType } from "@hylimo/core";
import { Element, Size, Rect, Point, Line, ArcSegment, LineSegment } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints, addToConstraints, addToSize } from "../layoutElement";
import { Layout } from "../layoutEngine";
import { ContentShapeLayoutConfig } from "./contentShapeLayoutConfig";

/**
 * Layout config for rect
 */
export class RectLayoutConfig extends ContentShapeLayoutConfig {
    constructor() {
        super(
            Rect.TYPE,
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
            cornerRadius = Math.min(element.styles.cornerRadius, size.width / 2, size.height / 2);
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
            if (result.strokeWidth) {
                contentSize = addToSize(contentSize, -2 * result.strokeWidth, -2 * result.strokeWidth);
                contentPosition = { x: position.x + result.strokeWidth, y: position.y + result.strokeWidth };
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
            const segments: (LineSegment | ArcSegment)[] = [
                lineSegment(x + width - radius, y),
                arcSegment(x + width - radius, y + radius, x + width, y + radius, radius),
                lineSegment(x + width, y + height - radius),
                arcSegment(x + width - radius, y + height - radius, x + width - radius, y + height, radius),
                lineSegment(x + radius, y + height),
                arcSegment(x + radius, y + height - radius, x, y + height - radius, radius),
                lineSegment(x, y + radius),
                arcSegment(x + radius, y + radius, x + radius, y, radius)
            ];
            return {
                start: {
                    x: x + radius,
                    y
                },
                segments
            };
        } else {
            return super.outline(layout, element, position, size);
        }
    }
}

/**
 * Helper to create a line segment
 *
 * @param x the end x coordinate
 * @param y the end y coordiate
 * @returns the generated line segment
 */
function lineSegment(x: number, y: number): LineSegment {
    return {
        type: LineSegment.TYPE,
        end: {
            x,
            y
        }
    };
}

/**
 * Helper to create a clockwise arc segment
 *
 * @param cx x coordinate of the center
 * @param cy y coordinate of the center
 * @param endX x coordinate of the end
 * @param endY y coordinate of the end
 * @param radius both x and y radius
 * @returns the created arc segment
 */
function arcSegment(cx: number, cy: number, endX: number, endY: number, radius: number): ArcSegment {
    return {
        type: ArcSegment.TYPE,
        clockwise: true,
        end: {
            x: endX,
            y: endY
        },
        center: {
            x: cx,
            y: cy
        },
        rx: radius,
        ry: radius
    };
}
