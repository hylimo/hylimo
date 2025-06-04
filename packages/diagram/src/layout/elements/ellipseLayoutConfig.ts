import type { Size, Element, Line, Segment } from "@hylimo/diagram-common";
import { Point, Ellipse, Math2D, ArcSegment } from "@hylimo/diagram-common";
import type { LayoutElement, SizeConstraints } from "../layoutElement.js";
import type { Layout } from "../engine/layout.js";
import { ContentShapeLayoutConfig } from "./contentShapeLayoutConfig.js";
import { getContentLayoutConfig } from "./layout/contentLayout.js";

/**
 * Layout config for ellipse
 */
export class EllipseLayoutConfig extends ContentShapeLayoutConfig {
    override type = Ellipse.TYPE;

    constructor() {
        super([], []);
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        this.normalizeStrokeWidth(element);
        const strokeWidth = element.styles.strokeWidth;
        if (element.children.length > 0) {
            const contentsSize = getContentLayoutConfig(element).measure(layout, element, {
                min: this.calculateInnerSize(constraints.min, strokeWidth),
                max: this.calculateInnerSize(constraints.max, strokeWidth)
            });
            return this.calculateOuterSize(contentsSize, strokeWidth);
        } else {
            return constraints.min;
        }
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const result: Ellipse = {
            type: Ellipse.TYPE,
            id,
            ...position,
            ...size,
            ...this.extractShapeProperties(element),
            children: [],
            edits: element.edits
        };
        if (element.children.length > 0) {
            const contentSize = this.calculateInnerSize(size, result.stroke?.width ?? 0);
            const contentPosition = Math2D.add(position, {
                x: (size.width - contentSize.width) / 2,
                y: (size.height - contentSize.height) / 2
            });
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
        const { width, height } = size;
        const { x, y } = position;
        const startPos = {
            x: x + width,
            y: y + height / 2
        };
        const center = { x: x + width / 2, y: y + height / 2 };
        const segments: Segment[] = [{ x, y: center.y }, startPos].map((endPos, index) => ({
            type: ArcSegment.TYPE,
            radiusX: width / 2,
            radiusY: height / 2,
            center,
            clockwise: true,
            end: endPos,
            origin: id,
            originSegment: index
        }));
        return {
            start: startPos,
            segments: segments,
            isClosed: true
        };
    }

    /**
     * Calculates a stroke width vector based on the stroke width and the size of the ellipse
     * This is the stroke width at 45°
     *
     * @param strokeWidth the stroke width
     * @param size the size of the ellipse
     * @returns the stroke vector at 45°
     */
    private calculate45DegreeStrokeVector(size: Size, strokeWidth: number): Point {
        if (strokeWidth === 0) {
            return Point.ORIGIN;
        }
        const sqrt2half = Math.sqrt(2) / 2;
        const dx = size.width / 2;
        const dy = size.height / 2;
        const nx = (dy * sqrt2half) / Math.sqrt(dy ** 2 / 2 + dx ** 2 / 2);
        const ny = (dx * sqrt2half) / Math.sqrt(dy ** 2 / 2 + dx ** 2 / 2);
        return Math2D.scaleTo({ x: nx, y: ny }, strokeWidth);
    }

    /**
     * Calculates the inner size without the border
     *
     * @param size the total size
     * @param strokeWidth the stroke width
     * @returns the inner size
     */
    private calculateInnerSize(size: Size, strokeWidth: number): Size {
        if (
            size.width === 0 ||
            size.width === Number.POSITIVE_INFINITY ||
            size.height === 0 ||
            size.height === Number.POSITIVE_INFINITY
        ) {
            return size;
        }
        const sqrt2half = Math.sqrt(2) / 2;
        const borderSize = this.calculate45DegreeStrokeVector(size, strokeWidth);
        return { width: sqrt2half * size.width - 2 * borderSize.x, height: sqrt2half * size.height - 2 * borderSize.y };
    }

    private calculateOuterSize(size: Size, strokeWidth: number): Size {
        const sqrt2half = Math.sqrt(2) / 2;
        const borderSize = this.calculate45DegreeStrokeVector(size, strokeWidth);
        return {
            width: (size.width + 2 * borderSize.x) / sqrt2half,
            height: (size.height + 2 * borderSize.y) / sqrt2half
        };
    }
}
