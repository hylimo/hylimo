import { Size, Point, Element, Path, LineJoin, LineCap } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../layoutElement";
import { Layout } from "../layoutEngine";
import { ShapeLayoutConfig } from "./shapeLayoutConfig";

/**
 * Layout config for HLine
 */
export class HLineLayoutConfig extends ShapeLayoutConfig {
    /**
     * Creates a new HLineLayoutconfig
     */
    constructor() {
        super("hline", [], []);
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        this.normalizeStrokeWidth(element);
        return {
            width: constraints.min.width,
            height: element.styles.strokeWidth
        };
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const shapeProperties = this.extractShapeProperties(element);
        const result: Path = {
            type: Path.TYPE,
            id,
            x: position.x,
            y: position.y + shapeProperties.strokeWidth! / 2,
            ...size,
            ...shapeProperties,
            path: `M0 0L${size.width} 0`,
            lineJoin: LineJoin.Bevel,
            lineCap: LineCap.Butt,
            miterLimit: 0,
            children: []
        };
        return [result];
    }
}
