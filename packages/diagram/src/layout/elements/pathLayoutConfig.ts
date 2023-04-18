import { stringType } from "@hylimo/core";
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
            []
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
        const layoutedPath = layout.engine.pathCache.getOrCompute(
            {
                path,
                stroke: shapeProperties.stroke,
                size
            },
            () => this.layoutPath(path, shapeProperties.stroke, size)
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
     * @returns the layouted path
     */
    private layoutPath(path: string, stroke: Stroke | undefined, size: Size): string {
        const originalPath = path;
        let error = Number.POSITIVE_INFINITY;
        let iterations = 0;
        let scaleX = 1;
        let scaleY = 1;
        let boundingBox = svgPathBbox(path, stroke);
        while (iterations < MAX_ITERATIONS && error > EPSILON) {
            const overflowX = boundingBox.overflow.left + boundingBox.overflow.right;
            const overflowY = boundingBox.overflow.top + boundingBox.overflow.bottom;
            const newScaleX = boundingBox.width === 0 ? 1 : (size.width - overflowX) / boundingBox.width;
            const newScaleY = boundingBox.height === 0 ? 1 : (size.height - overflowY) / boundingBox.height;
            scaleX = scaleX * newScaleX;
            scaleY = scaleY * newScaleY;
            const newPath = svgPath(originalPath).scale(scaleX, scaleY).toString();
            const newBoundingBox = svgPathBbox(newPath, stroke);
            const newError =
                Math.abs(size.width - (boundingBox.width + boundingBox.overflow.left + boundingBox.overflow.right)) +
                Math.abs(size.height - (boundingBox.height + boundingBox.overflow.top + boundingBox.overflow.bottom));
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
