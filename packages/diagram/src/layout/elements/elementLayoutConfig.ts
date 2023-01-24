import { Expression, ExpressionMetadata, listType, optional, stringType } from "@hylimo/core";
import { Element, Point, Size } from "@hylimo/diagram-common";
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
     * Converts the expressions to the list of their start offsets
     * Returns undefined if any expression is undefined, or its position, or if there are duplicate start offsets.
     *
     * @param expressions the list of expressions
     * @returns the start offsets or undefined if edit is not supported
     */
    protected generateEditableNumbers(...expressions: (Expression | undefined)[]): number[] | undefined {
        if (expressions.some((expression) => !ExpressionMetadata.isEditable(expression?.metadata))) {
            return undefined;
        }
        const positions = expressions.map((expression) => expression!.metadata.position!.startOffset);
        if (new Set(positions).size < positions.length) {
            return undefined;
        } else {
            return positions;
        }
    }
}
