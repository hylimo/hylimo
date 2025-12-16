import { finiteNumberType } from "@hylimo/core";
import type { Element, Size, Point, Line, ArcSegment, LineSegment } from "@hylimo/diagram-common";
import { Rect } from "@hylimo/diagram-common";
import type { LayoutElement, SizeConstraints } from "../layoutElement.js";
import { addToConstraints, addToSize } from "../layoutElement.js";
import type { Layout } from "../engine/layout.js";
import { ContentShapeLayoutConfig } from "./contentShapeLayoutConfig.js";
import { getContentLayoutConfig } from "./layout/contentLayout.js";

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
                    type: finiteNumberType
                }
            ]
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        this.normalizeStrokeWidth(element);
        const strokeWidth = element.styles.strokeWidth;
        if (element.children.length > 0) {
            const contentsSize = getContentLayoutConfig(element).measure(
                layout,
                element,
                addToConstraints(constraints, -2 * strokeWidth, -2 * strokeWidth)
            );
            const size = addToSize(contentsSize, 2 * strokeWidth, 2 * strokeWidth);
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
            children: [],
            edits: element.edits
        };
        if (element.children.length > 0) {
            let contentSize = size;
            let contentPosition = position;
            const strokeWidth = result.stroke?.width;
            if (strokeWidth) {
                contentSize = addToSize(contentSize, -2 * strokeWidth, -2 * strokeWidth);
                contentPosition = { x: position.x + strokeWidth, y: position.y + strokeWidth };
            }
            result.children.push(
                ...getContentLayoutConfig(element).layout(layout, element, contentPosition, contentSize, id)
            );
        }
        if (element.isHidden) {
            return result.children;
        } else {
            return [result];
        }
    }

    override outline(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Line {
        if (element.cornerRadius) {
            const radius: number = element.cornerRadius;
            const { x, y } = position;
            const { width, height } = size;
            const startPos = {
                x: x + width,
                y: y + height / 2
            };
            const segments: (LineSegment | ArcSegment)[] = [
                this.lineSegment(x + width, y + height - radius, id, 0),
                this.arcSegment(x + width - radius, y + height - radius, x + width - radius, y + height, radius, id, 1),
                this.lineSegment(x + width / 2, y + height, id, 2),
                this.lineSegment(x + radius, y + height, id, 3),
                this.arcSegment(x + radius, y + height - radius, x, y + height - radius, radius, id, 4),
                this.lineSegment(x, y + height / 2, id, 5),
                this.lineSegment(x, y + radius, id, 6),
                this.arcSegment(x + radius, y + radius, x + radius, y, radius, id, 7),
                this.lineSegment(x + width / 2, y, id, 8),
                this.lineSegment(x + width - radius, y, id, 9),
                this.arcSegment(x + width - radius, y + radius, x + width, y + radius, radius, id, 10),
                this.lineSegment(startPos.x, startPos.y, id, 11)
            ];
            return {
                start: startPos,
                segments,
                isClosed: true
            };
        } else {
            return super.outline(layout, element, position, size, id);
        }
    }
}
