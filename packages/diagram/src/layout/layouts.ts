import { Element } from "../model/base";
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
 * Known layouts
 */
export const layouts: LayoutElementConfig[] = [
    {
        type: "rect",
        styleAttributes: shapeStyleAttributes,
        measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
            const strokeWidth = element.styles.strokeWidth ?? 0;
            const contentElement = layout.measure(
                element.element.content,
                element,
                addToConstraints(constraints, -2 * strokeWidth, -2 * strokeWidth)
            );
            element.content = contentElement;
            return addToSize(contentElement.measuredSize!, 2 * strokeWidth, 2 * strokeWidth);
        },
        layout(layout: Layout, element: LayoutElement, position: Position, size: Size): Element {
            return undefined as any;
        }
    }
];
