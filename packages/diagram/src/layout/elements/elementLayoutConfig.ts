import {
    ExecutableAbstractFunctionExpression,
    Expression,
    ExpressionMetadata,
    Type,
    fun,
    listType,
    optional,
    stringType
} from "@hylimo/core";
import { ArcSegment, Element, Line, LineSegment, EditSpecification, Point, Size } from "@hylimo/diagram-common";
import { LayoutElement, LayoutConfig, SizeConstraints, AttributeConfig, ContentCardinality } from "../layoutElement.js";
import { Layout } from "../layoutEngine.js";

/**
 * Base class for all layout element configs
 */
export abstract class ElementLayoutConfig implements LayoutConfig {
    /**
     * Supported non-style attributes
     */
    readonly attributes: AttributeConfig[] = [
        {
            name: "class",
            description: "classes, can be used for styling",
            type: optional(listType(stringType))
        }
    ];

    /**
     * What type of element is supported
     */
    abstract readonly type: string;
    /**
     * The type of the contents attribute
     */
    abstract readonly contentType: Type;
    /**
     * The cardinality of the contents attribute
     */
    abstract readonly contentCardinality: ContentCardinality;

    /**
     * Assigns type and styleAttributes
     *
     * @param additionalAttributes additional non-style attributes
     * @param styleAttributes the supported style attributes
     */
    constructor(
        additionalAttributes: AttributeConfig[],
        readonly styleAttributes: AttributeConfig[]
    ) {
        this.attributes.push(...additionalAttributes);
    }

    /**
     * Called to determine the size the element requires
     *
     * @param layout performs the layout
     * @param element the element to measure
     * @param constraints defines min and max size
     * @returns the calculated size
     */
    abstract measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size;

    /**
     * Called to render the element
     *
     * @param layout performs the layout
     * @param element the element to render
     * @param position offset in current context
     * @param size the size of the element
     * @param id the id of the element
     * @returns the rendered element
     */
    abstract layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[];

    /**
     * Called to create the outline of an element.
     * Default implementation just returns the bounding box rect, starting at the center right position
     *
     * @param layout performs the layout
     * @param element the element to get the outline of
     * @param position offset in current context
     * @param size the size of the element
     * @returns the outline of the element
     */
    outline(layout: Layout, element: LayoutElement, position: Point, size: Size): Line {
        const { x, y } = position;
        const { width, height } = size;
        const startPos = {
            x: x + width,
            y: y + height / 2
        };
        const segments: LineSegment[] = [
            this.lineSegment(x + width, y + height),
            this.lineSegment(x + width / 2, y + height),
            this.lineSegment(x, y + height),
            this.lineSegment(x, y + height / 2),
            this.lineSegment(x, y),
            this.lineSegment(x + width / 2, y),
            this.lineSegment(x + width, y),
            this.lineSegment(startPos.x, startPos.y)
        ];
        return {
            start: startPos,
            segments
        };
    }

    /**
     * Helper to create a line segment
     *
     * @param x the end x coordinate
     * @param y the end y coordiate
     * @returns the generated line segment
     */
    protected lineSegment(x: number, y: number): LineSegment {
        return {
            type: LineSegment.TYPE,
            end: {
                x,
                y
            }
        };
    }

    /**
     * Helper to create a clockwise arc segment
     *
     * @param cx x coordinate of the center
     * @param cy y coordinate of the center
     * @param endX x coordinate of the end
     * @param endY y coordinate of the end
     * @param radius both x and y radius
     * @returns the created arc segment
     */
    protected arcSegment(cx: number, cy: number, endX: number, endY: number, radius: number): ArcSegment {
        return {
            type: ArcSegment.TYPE,
            clockwise: true,
            end: {
                x: endX,
                y: endY
            },
            center: {
                x: cx,
                y: cy
            },
            radiusX: radius,
            radiusY: radius
        };
    }

    /**
     * Called to provide a function which evaluates to the prototype of the element.
     * The function will be called with the general element prototype as first argument.
     *
     * @returns the prototype generation function
     */
    createPrototype(): ExecutableAbstractFunctionExpression {
        return fun("object(proto = it)");
    }
}
