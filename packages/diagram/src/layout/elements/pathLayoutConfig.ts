import { enumType, stringType } from "@hylimo/core";
import { Size, Point, Element, Path, Stroke } from "@hylimo/diagram-common";
import svgPath from "svgpath";
import { svgPathBbox } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../layoutElement";
import { Layout, LayoutedPath } from "../layoutEngine";
import { ShapeLayoutConfig } from "./shapeLayoutConfig";

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
    constructor() {
        super(
            Path.TYPE,
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
            ]
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const shapeProperties = this.extractShapeProperties(element);
        const path = element.element.getLocalFieldOrUndefined("path")?.value.toNative();
        const stretch = element.styles.stretch ?? StretchMode.FILL;
        const layoutedPath = layout.engine.pathCache.getOrCompute(
            {
                path,
                stroke: shapeProperties.stroke,
                constraints,
                stretch
            },
            () => this.layoutPath(path, shapeProperties.stroke, constraints, stretch)
        );
        element.layoutedPath = layoutedPath;
        element.shapeProperties = shapeProperties;
        return layoutedPath.size;
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const result: Path = {
            type: Path.TYPE,
            id,
            ...position,
            ...size,
            ...element.shapeProperties,
            path: element.layoutedPath.path,
            children: []
        };
        return [result];
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
    private layoutPath(
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
