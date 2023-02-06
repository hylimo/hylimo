import { Size, Point, Element, Path } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../layoutElement";
import { Layout } from "../layoutEngine";
import { ShapeLayoutConfig } from "./shapeLayoutConfig";

/**
 * Layout config for VLine
 */
export class VLineLayoutConfig extends ShapeLayoutConfig {
    /**
     * Creates a new VLineLayoutconfig
     */
    constructor() {
        super("vline", [], []);
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        this.normalizeStrokeWidth(element);
        return {
            width: element.styles.strokeWidth,
            height: constraints.min.height
        };
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const shapeProperties = this.extractShapeProperties(element);
        const result: Path = {
            type: Path.TYPE,
            id,
            x: position.x + shapeProperties.strokeWidth! / 2,
            y: position.y,
            ...size,
            ...shapeProperties,
            path: `M0 0L0 ${size.height}`,
            children: []
        };
        return [result];
    }
}
