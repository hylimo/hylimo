import { enumType, stringType } from "@hylimo/core";
import { Size, Point, Element, Path, Stroke } from "@hylimo/diagram-common";
import svgPath from "svgpath";
import { svgPathBbox } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../layoutElement";
import { Layout } from "../layoutEngine";
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
        const strokeWidth = this.extractShapeProperties(element).stroke?.width ?? 0;
        return {
            width: Math.max(constraints.min.width, strokeWidth),
            height: Math.max(constraints.min.height, strokeWidth)
        };
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const shapeProperties = this.extractShapeProperties(element);
        const path = element.element.getLocalFieldOrUndefined("path")?.value.toNative();
        const stretch = element.styles.stretch ?? StretchMode.FILL;
        const layoutedPath = layout.engine.pathCache.getOrCompute(
            {
                path,
                stroke: shapeProperties.stroke,
                size,
                stretch
            },
            () => this.layoutPath(path, shapeProperties.stroke, size, stretch)
        );
        const result: Path = {
            type: Path.TYPE,
            id,
            ...position,
            ...size,
            ...shapeProperties,
            path: layoutedPath,
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
    private layoutPath(path: string, stroke: Stroke | undefined, size: Size, stretch: StretchMode): string {
        const originalPath = path;
        let error = Number.POSITIVE_INFINITY;
        let iterations = 0;
        let scaleX = 1;
        let scaleY = 1;
        let boundingBox = svgPathBbox(path, stroke);
        while (iterations < MAX_ITERATIONS && error > EPSILON) {
            const overflowX = boundingBox.overflow.left + boundingBox.overflow.right;
            const overflowY = boundingBox.overflow.top + boundingBox.overflow.bottom;
            let newScaleX = boundingBox.width === 0 ? 1 : (size.width - overflowX) / boundingBox.width;
            let newScaleY = boundingBox.height === 0 ? 1 : (size.height - overflowY) / boundingBox.height;
            if (stretch === StretchMode.UNIFORM) {
                newScaleX = newScaleY = Math.min(newScaleX, newScaleY);
            }
            scaleX = scaleX * newScaleX;
            scaleY = scaleY * newScaleY;
            const newPath = svgPath(originalPath).scale(scaleX, scaleY).toString();
            const newBoundingBox = svgPathBbox(newPath, stroke);
            let newError: number;
            const newErrorX =
                size.width - (newBoundingBox.width + newBoundingBox.overflow.left + newBoundingBox.overflow.right);
            const newErrorY =
                size.height - (newBoundingBox.height + newBoundingBox.overflow.top + newBoundingBox.overflow.bottom);
            if (stretch === StretchMode.FILL) {
                newError = Math.abs(newErrorX) + Math.abs(newErrorY);
            } else {
                newError = Math.min(Math.abs(newErrorX), Math.abs(newErrorY));
                if (newErrorX > 0) {
                    newError += newErrorX;
                }
                if (newErrorY > 0) {
                    newError += newErrorY;
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
        return svgPath(path)
            .translate(-boundingBox.x + boundingBox.overflow.left, -boundingBox.y + boundingBox.overflow.top)
            .toString();
    }
}
