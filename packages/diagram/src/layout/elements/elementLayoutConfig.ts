import { Expression, ExpressionMetadata, listType, optional, stringType } from "@hylimo/core";
import { Element, Line, LineSegment, ModificationSpecification, Point, Size } from "@hylimo/diagram-common";
import { LayoutElement, LayoutConfig, SizeConstraints, AttributeConfig } from "../layoutElement";
import { Layout } from "../layoutEngine";

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
     * Assigns type and styleAttributes
     *
     * @param type the supported type
     * @param additionalAttributes additional non-style attributes
     * @param styleAttributes the supported style attributes
     */
    constructor(
        readonly type: string,
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
     * Converts the expressions to a ModificationSpecification
     *
     * @param expressions expression with associated key
     * @returns the generated ModificationSpecification
     */
    protected generateModificationSpecification(expressions: {
        [key: string]: Expression | undefined;
    }): ModificationSpecification {
        const result: { [key: string]: [number, number] } = {};
        for (const [key, expression] of Object.entries(expressions)) {
            if (!ExpressionMetadata.isEditable(expression?.metadata)) {
                return null;
            }
            const position = expression!.position!;
            result[key] = [position.startOffset, position.endOffset];
        }
        return result;
    }

    /**
     * Called to create the outline of an element.
     * Default implementation just returns the bounding box rect, starting at the top left position
     *
     * @param layout performs the layout
     * @param element the element to get the outline of
     * @param position offset in current context
     * @param size the size of the element
     * @returns the outline of the element
     */
    outline(layout: Layout, element: LayoutElement, position: Point, size: Size): Line {
        const segments: LineSegment[] = [
            {
                type: LineSegment.TYPE,
                end: {
                    x: position.x + size.width,
                    y: position.y
                }
            },
            {
                type: LineSegment.TYPE,
                end: {
                    x: position.x + size.width,
                    y: position.y + size.height
                }
            },
            {
                type: LineSegment.TYPE,
                end: {
                    x: position.x,
                    y: position.y + size.height
                }
            },
            {
                type: LineSegment.TYPE,
                end: position
            }
        ];
        return {
            start: position,
            segments
        };
    }
}
