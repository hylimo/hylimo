import { Element } from "../model/base";
import { Rect } from "../model/model";
import {
    LayoutElement,
    LayoutElementConfig,
    Size,
    SizeConstraints,
    Position,
    addToConstraints,
    addToSize
} from "./layoutElement";
import { Layout } from "./layoutEngine";

/**
 * Style attributes for normal elements
 */
const elementStyleAttributes = [
    "width",
    "height",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "margin",
    "horizontalAlignment",
    "verticalAlignment"
];

/**
 * Style attributes for shapes
 */
const shapeStyleAttributes = [
    ...elementStyleAttributes,
    "fill",
    "fillOpacity",
    "stroke",
    "stokeOpacity",
    "strokeWidth",
    "strokeDash"
];

/**
 * Helper to get shape styles properties
 *
 * @param element provides the styles
 * @returns an object with all shape style properties
 */
function extractShapeProperties(element: LayoutElement): {
    fill?: string;
    fillOpacity?: number;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
} {
    const styles = element.styles;
    return {
        fill: styles.fill,
        fillOpacity: styles.fillOpacity,
        stroke: styles.stroke,
        strokeOpacity: styles.strokeOpacity,
        strokeWidth: styles.strokeWidth
    };
}

/**
 * Known layouts
 */
export const layouts: LayoutElementConfig[] = [
    {
        type: "rect",
        styleAttributes: shapeStyleAttributes,
        measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
            const strokeWidth = element.styles.strokeWidth ?? 0;
            const content = element.element.content;
            if (content) {
                const contentElement = layout.measure(
                    content,
                    element,
                    addToConstraints(constraints, -2 * strokeWidth, -2 * strokeWidth)
                );
                element.content = contentElement;
                const size = addToSize(contentElement.measuredSize!, 2 * strokeWidth, 2 * strokeWidth);
                return size;
            } else {
                return constraints.min;
            }
        },
        layout(layout: Layout, element: LayoutElement, position: Position, size: Size): Element[] {
            const result: Rect = {
                type: "rect",
                id: "",
                ...position,
                ...size,
                ...extractShapeProperties(element),
                contents: []
            };
            if (element.content) {
                let contentSize = size;
                let contentPosition = position;
                if (result.strokeWidth) {
                    contentSize = addToSize(contentSize, 2 * result.strokeWidth, 2 * result.strokeWidth);
                    contentPosition = { x: position.x + result.strokeWidth, y: position.y + result.strokeWidth };
                }
                result.contents.push(...layout.layout(element.content, contentPosition, contentSize));
            }
            return [result];
        }
    }
];
