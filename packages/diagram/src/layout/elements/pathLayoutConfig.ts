import { enumType, numberType, stringType } from "@hylimo/core";
import { Size, Point, Element, Path, LineJoin, LineCap } from "@hylimo/diagram-common";
import svgPath from "svgpath";
import { svgPathBbox } from "../../path/svgPathBbox";
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

    override measure(layout: Layout, element: LayoutElement, _constraints: SizeConstraints): Size {
        const additionalStrokeProperties = this.extractAdditionalStrokeProperties(element);
        const shapeProperties = this.extractShapeProperties(element);
        const path = element.element.getLocalFieldOrUndefined("path")?.value.toNative();
        const boundingBox = svgPathBbox(path, {
            ...additionalStrokeProperties,
            lineWidth: shapeProperties.strokeWidth ?? 0
        });
        const preferedSize = {
            width: boundingBox[2] - boundingBox[0],
            height: boundingBox[3] - boundingBox[1]
        };
        element.boundsAndProperties = {
            properties: {
                ...shapeProperties,
                ...additionalStrokeProperties
            },
            path,
            viewBox: {
                x: boundingBox[0],
                y: boundingBox[1],
                ...preferedSize
            }
        };
        return preferedSize;
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const path = element.boundsAndProperties.path as string;
        const viewBox = element.boundsAndProperties.viewBox as Point & Size;
        const result: Path = {
            type: Path.TYPE,
            id,
            ...position,
            ...size,
            ...element.boundsAndProperties.properties,
            path: svgPath(path)
                .translate(-viewBox.x, -viewBox.y)
                .scale(size.width / viewBox.width, size.height / viewBox.height)
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
