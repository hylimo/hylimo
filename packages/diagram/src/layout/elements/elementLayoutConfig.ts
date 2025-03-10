import type { ExecutableAbstractFunctionExpression, FullObject, Type } from "@hylimo/core";
import { fun, listType, optional, stringType } from "@hylimo/core";
import type { Element, Line, Point, Size } from "@hylimo/diagram-common";
import { ArcSegment, LineSegment } from "@hylimo/diagram-common";
import type { LayoutElement, LayoutConfig, SizeConstraints, AttributeConfig } from "../layoutElement.js";
import { ContentCardinality } from "../layoutElement.js";
import type { Layout } from "../engine/layout.js";
import type { Matrix } from "transformation-matrix";

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
     * Supported style attributes
     */
    readonly styleAttributes: AttributeConfig[];

    /**
     * The content or contents attribute if present, otherwise an empty array
     */
    readonly contentAttributes: AttributeConfig[];

    /**
     * What type of element is supported
     */
    abstract readonly type: string;

    /**
     * A string prefix which uses a specific group of ids for the element
     * To keep short ids, should be short / a single character
     */
    readonly idGroup: string = "";

    /**
     * Assigns type and styleAttributes
     *
     * @param additionalAttributes additional non-style attributes
     * @param styleAttributes the supported style attributes
     * @param contentType the type of the contents attribute
     * @param contentCardinality the cardinality of the contents attribute
     */
    constructor(
        additionalAttributes: AttributeConfig[],
        styleAttributes: AttributeConfig[],
        readonly contentType: Type,
        readonly contentCardinality: ContentCardinality
    ) {
        this.attributes.push(...additionalAttributes);
        this.styleAttributes = styleAttributes.map((attribute) => ({
            name: attribute.name,
            description: attribute.description,
            type: optional(attribute.type)
        }));
        this.contentAttributes = this.computeContentAttributes();
    }

    /**
     * Computes the attribute configs for the content or contents attribute
     *
     * @returns an array of the content or contents attribute config or an empty array
     */
    private computeContentAttributes(): AttributeConfig[] {
        const isManyContent =
            this.contentCardinality === ContentCardinality.Many ||
            this.contentCardinality === ContentCardinality.AtLeastOne;
        const contentAttributes: AttributeConfig[] = [];
        if (this.contentCardinality === ContentCardinality.ExactlyOne) {
            contentAttributes.push({
                name: "content",
                description: "the content of the element",
                type: this.contentType
            });
        } else if (this.contentCardinality === ContentCardinality.Optional) {
            contentAttributes.push({
                name: "content",
                description: "the content of the element",
                type: optional(this.contentType)
            });
        } else if (isManyContent) {
            contentAttributes.push({
                name: "contents",
                description: "the contents of the element",
                type: optional(listType(this.contentType))
            });
        }
        return contentAttributes;
    }

    /**
     * Returns the children of the element
     *
     * @param element the element to get the children of
     * @returns the children of the element
     */
    abstract getChildren(element: LayoutElement): FullObject[];

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
     * @param id the id of the element
     * @returns the outline of the element
     */
    outline(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Line {
        const { x, y } = position;
        const { width, height } = size;
        const startPos = {
            x: x + width,
            y: y + height / 2
        };
        const segments: LineSegment[] = [
            this.lineSegment(x + width, y + height, id, 0),
            this.lineSegment(x + width / 2, y + height, id, 1),
            this.lineSegment(x, y + height, id, 2),
            this.lineSegment(x, y + height / 2, id, 3),
            this.lineSegment(x, y, id, 4),
            this.lineSegment(x + width / 2, y, id, 5),
            this.lineSegment(x + width, y, id, 6),
            this.lineSegment(startPos.x, startPos.y, id, 7)
        ];
        return {
            start: startPos,
            segments,
            isClosed: true
        };
    }

    /**
     * Helper to create a line segment
     *
     * @param x the end x coordinate
     * @param y the end y coordiate
     * @param origin the origin of the segment
     * @param originSegment the index of the segment of {@link origin} this segment originates from
     * @returns the generated line segment
     */
    protected lineSegment(x: number, y: number, origin: string, originSegment: number): LineSegment {
        return {
            type: LineSegment.TYPE,
            end: {
                x,
                y
            },
            origin,
            originSegment
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
     * @param origin the origin of the segment
     * @param originSegment the index of the segment of {@link origin} this segment originates from
     * @returns the created arc segment
     */
    protected arcSegment(
        cx: number,
        cy: number,
        endX: number,
        endY: number,
        radius: number,
        origin: string,
        originSegment: number
    ): ArcSegment {
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
            radiusY: radius,
            origin,
            originSegment
        };
    }

    /**
     * Called to provide a function which evaluates to the prototype of the element.
     * The function will be called with the general element prototype as first argument.
     *
     * @returns the prototype generation function
     */
    createPrototype(): ExecutableAbstractFunctionExpression {
        return fun("[proto = it]");
    }

    /**
     * Creates a matrix which transforms from the local to the parent coordinate system
     * Can return undefined if the element does not have a parent or if the transformation is the identity matrix
     *
     * @param _element the element to transform
     * @returns the transformation matrix
     */
    localToParent(_element: LayoutElement): Matrix | undefined {
        return undefined;
    }
}
