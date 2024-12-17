import { enumType, FullObject, nullType, stringType } from "@hylimo/core";
import { Size, Point, Element, Path, Stroke } from "@hylimo/diagram-common";
import svgPath from "svgpath";
import { svgPathBbox } from "@hylimo/diagram-common";
import { ContentCardinality, LayoutElement, SizeConstraints } from "../layoutElement.js";
import { LayoutedPath } from "../engine/layoutEngine.js";
import { Layout } from "../engine/layout.js";
import { ShapeLayoutConfig } from "./shapeLayoutConfig.js";

/**
 * The maximum number of iterations
 */
const MAX_ITERATIONS = 15;
/**
 * A small error
 */
const EPSILON = 0.00000000001;

/**
 * Different stretch modes
 */
export enum StretchMode {
    /**
     * The path is stretched to fill the available space
     */
    FILL = "fill",
    /**
     * The path is stretched uniformly
     */
    UNIFORM = "uniform"
}

/**
 * Layout config for path
 */
export class PathLayoutConfig extends ShapeLayoutConfig {
    override type = Path.TYPE;

    constructor() {
        super(
            [
                {
                    name: "path",
                    description: "the SVG path string",
                    type: stringType
                }
            ],
            [
                {
                    name: "stretch",
                    description: "the stretch mode",
                    type: enumType(StretchMode)
                }
            ],
            nullType,
            ContentCardinality.None
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const shapeProperties = this.extractShapeProperties(element);
        const path = element.element.getLocalFieldOrUndefined("path")?.value.toNative();
        const stretch = element.styles.stretch ?? StretchMode.FILL;
        const layoutedPath = this.layoutPath(path, shapeProperties.stroke, constraints, stretch, layout);
        element.layoutedPath = layoutedPath;
        element.shapeProperties = shapeProperties;
        const strokeWidth = shapeProperties.stroke?.width ?? 0;
        return {
            width: Math.max(layoutedPath.size.width, strokeWidth),
            height: Math.max(layoutedPath.size.height, strokeWidth)
        };
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        if (element.isHidden) {
            return [];
        }
        const expectedSize = element.layoutedPath.size;
        const shapeProperties = element.shapeProperties;
        let layoutedPath = element.layoutedPath;
        if (size.width !== expectedSize.width || size.height !== expectedSize.height) {
            const path = element.element.getLocalFieldOrUndefined("path")?.value.toNative();
            const stretch = element.styles.stretch ?? StretchMode.FILL;
            layoutedPath = this.layoutPath(
                path,
                shapeProperties.stroke,
                {
                    min: size,
                    max: size
                },
                stretch,
                layout
            );
        }
        const result: Path = {
            type: Path.TYPE,
            id,
            ...position,
            ...size,
            ...element.shapeProperties,
            path: layoutedPath.path,
            children: [],
            edits: element.edits
        };
        return [result];
    }

    override getChildren(): FullObject[] {
        return [];
    }

    /**
     * Layouts a path iteratively
     * Also handles caching
     *
     * @param path the path to layout
     * @param stroke the stroke of the path
     * @param size the size to use
     * @param stretch the stretch mode to use
     * @param layout the layout to use
     * @returns the layouted path
     */
    private layoutPath(
        path: string,
        stroke: Stroke | undefined,
        constraints: SizeConstraints,
        stretch: StretchMode,
        layout: Layout
    ): LayoutedPath {
        const layoutedPath = layout.engine.pathCache.getOrCompute(
            {
                path,
                stroke,
                constraints,
                stretch
            },
            () => this.layoutPathInternal(path, stroke, constraints, stretch)
        );
        return layoutedPath;
    }

    /**
     * Layouts a path iteratively
     *
     * @param path the path to layout
     * @param stroke the stroke of the path
     * @param size the size to use
     * @param stretch the stretch mode to use
     * @returns the layouted path
     */
    private layoutPathInternal(
        path: string,
        stroke: Stroke | undefined,
        constraints: SizeConstraints,
        stretch: StretchMode
    ): LayoutedPath {
        const originalPath = path;
        let error = Number.POSITIVE_INFINITY;
        let iterations = 0;
        let scaleX = 1;
        let scaleY = 1;
        let boundingBox = svgPathBbox(path, stroke);
        const { width: minWidth, height: minHeight } = constraints.min;
        const { width: maxWidth, height: maxHeight } = constraints.max;
        let width = 0;
        let height = 0;
        while (iterations < MAX_ITERATIONS && error > EPSILON) {
            const overflowX = boundingBox.overflow.left + boundingBox.overflow.right;
            const overflowY = boundingBox.overflow.top + boundingBox.overflow.bottom;
            const minScaleX = boundingBox.width === 0 ? 1 : (minWidth - overflowX) / boundingBox.width;
            const minScaleY = boundingBox.height === 0 ? 1 : (minHeight - overflowY) / boundingBox.height;
            let newScaleX: number;
            let newScaleY: number;
            if (stretch === StretchMode.UNIFORM) {
                const newMaxScaleX = boundingBox.width === 0 ? 1 : (maxWidth - overflowX) / boundingBox.width;
                const newMaxScaleY = boundingBox.height === 0 ? 1 : (maxHeight - overflowY) / boundingBox.height;
                newScaleX = newScaleY = Math.min(newMaxScaleX, newMaxScaleY, Math.max(minScaleX, minScaleY));
            } else {
                newScaleX = minScaleX;
                newScaleY = minScaleY;
            }
            scaleX = scaleX * newScaleX;
            scaleY = scaleY * newScaleY;
            const newPath = svgPath(originalPath).scale(scaleX, scaleY).toString();
            const newBoundingBox = svgPathBbox(newPath, stroke);
            width = newBoundingBox.width + newBoundingBox.overflow.left + newBoundingBox.overflow.right;
            height = newBoundingBox.height + newBoundingBox.overflow.top + newBoundingBox.overflow.bottom;
            let newError = 0;
            if (width > maxWidth) {
                newError += width - maxWidth;
            }
            if (height > maxHeight) {
                newError += height - maxHeight;
            }
            if (stretch === StretchMode.FILL) {
                newError += Math.abs(width - minWidth) + Math.abs(height - minHeight);
            } else {
                if (scaleX == minScaleX) {
                    newError += Math.abs(height - minHeight);
                }
                if (scaleY == minScaleY) {
                    newError += Math.abs(width - minWidth);
                }
            }
            if (newError > error) {
                break;
            }
            error = newError;
            path = newPath;
            boundingBox = newBoundingBox;
            iterations++;
        }
        return {
            path: svgPath(path)
                .translate(-boundingBox.x + boundingBox.overflow.left, -boundingBox.y + boundingBox.overflow.top)
                .toString(),
            size: {
                width,
                height
            }
        };
    }
}
