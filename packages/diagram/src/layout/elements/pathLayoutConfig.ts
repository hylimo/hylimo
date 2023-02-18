import { enumType, numberType, stringType } from "@hylimo/core";
import { Size, Point, Element, Path, LineJoin, LineCap } from "@hylimo/diagram-common";
import svgPath from "svgpath";
import { PathBBox, svgPathBbox } from "../../path/svgPathBbox";
import { LayoutElement, SizeConstraints } from "../layoutElement";
import { Layout } from "../layoutEngine";
import { ShapeLayoutConfig } from "./shapeLayoutConfig";

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
                    name: "lineJoin",
                    description: "the line join style",
                    type: enumType(LineJoin)
                },
                {
                    name: "lineCap",
                    description: "the line cap style",
                    type: enumType(LineCap)
                },
                {
                    name: "miterLimit",
                    description: "the miter limit",
                    type: numberType
                }
            ]
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const additionalStrokeProperties = this.extractAdditionalStrokeProperties(element);
        const shapeProperties = this.extractShapeProperties(element);
        const path = element.element.getLocalFieldOrUndefined("path")?.value.toNative();
        const boundingBox = svgPathBbox(path, {
            ...additionalStrokeProperties,
            lineWidth: shapeProperties.strokeWidth ?? 0
        });
        element.boundsAndProperties = {
            properties: {
                ...shapeProperties,
                ...additionalStrokeProperties
            },
            path,
            boundingBox
        };
        const minSize = constraints.min;
        const maxSize = constraints.max;
        const overflowX = boundingBox.overflow.left + boundingBox.overflow.right;
        const overflowY = boundingBox.overflow.top + boundingBox.overflow.bottom;
        const [minScaleX, maxScaleX] = this.calculateScaleRange(
            boundingBox.width,
            overflowX,
            minSize.width,
            maxSize.width
        );
        const [minScaleY, maxScaleY] = this.calculateScaleRange(
            boundingBox.height,
            overflowY,
            minSize.height,
            maxSize.height
        );
        const scale = this.calculateScale(minScaleX, minScaleY, maxScaleX, maxScaleY);
        return {
            width: boundingBox.width * scale + overflowX,
            height: boundingBox.height * scale + overflowY
        };
    }

    /**
     * Calculates the scale range for a given length, overflow and min/max length.
     *
     * @param length the inner length
     * @param overflow the total overflow, sum of start and end overflow
     * @param minLength the minimum length
     * @param maxLength the maximum length
     * @returns the scale range, consisting of minimum and maximum scale
     */
    private calculateScaleRange(
        length: number,
        overflow: number,
        minLength: number,
        maxLength: number
    ): [number, number] {
        if (length === 0) {
            return [1, 1];
        }
        const minScale = (minLength - overflow) / length;
        const maxScale = (maxLength - overflow) / length;
        return [minScale, maxScale];
    }

    /**
     * Calculates the scale given scale ranges for x and y.
     * If the ranges overlap, the minimum of the overlapping range is returned.
     * Otherwise the maximum of the smaller range is returned.
     *
     * @param minScaleX the minimum scale for x
     * @param minScaleY the minimum scale for y
     * @param maxScaleX the maximum scale for x
     * @param maxScaleY the maximum scale for y
     * @returns the calculated scale
     */
    private calculateScale(minScaleX: number, minScaleY: number, maxScaleX: number, maxScaleY: number): number {
        const overlap = Math.min(maxScaleX, maxScaleY) - Math.max(minScaleX, minScaleY);
        if (overlap > 0) {
            return Math.max(minScaleX, minScaleY);
        } else {
            return Math.min(maxScaleX, maxScaleY);
        }
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const path = element.boundsAndProperties.path as string;
        const boundingBox = element.boundsAndProperties.boundingBox as PathBBox;
        const overflowX = boundingBox.overflow.left + boundingBox.overflow.right;
        const overflowY = boundingBox.overflow.top + boundingBox.overflow.bottom;
        const scaleX = boundingBox.width === 0 ? 1 : (size.width - overflowX) / boundingBox.width;
        const scaleY = boundingBox.height === 0 ? 1 : (size.height - overflowY) / boundingBox.height;
        const scale = Math.min(scaleX, scaleY);
        const result: Path = {
            type: Path.TYPE,
            id,
            ...position,
            ...size,
            ...element.boundsAndProperties.properties,
            path: svgPath(path)
                .translate(-boundingBox.x, -boundingBox.y)
                .scale(scale)
                .translate(boundingBox.overflow.left, boundingBox.overflow.top)
                .toString(),
            children: []
        };
        return [result];
    }

    /**
     * Extracts lineJoin, lineCap and miterLimit from the element.
     * If not defined, adds default values.
     *
     * @param element the element to extract the properties from
     * @returns the extracted properties
     */
    private extractAdditionalStrokeProperties(
        element: LayoutElement
    ): Pick<Path, "lineJoin" | "lineCap" | "miterLimit"> {
        return {
            lineJoin: element.styles.lineJoin ?? LineJoin.Miter,
            lineCap: element.styles.lineCap ?? LineCap.Butt,
            miterLimit: element.styles.miterLimit ?? 4
        };
    }
}
