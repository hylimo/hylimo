import { Element } from "../../model/base";
import { LayoutElement, LayoutElementConfig, Position, Size, SizeConstraints } from "../layoutElement";
import { Layout } from "../layoutEngine";

/**
 * Base class for all layout element configs
 */
export abstract class BaseElementLayoutConfig implements LayoutElementConfig {
    readonly styleAttributes: string[] = [
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
        "hAlign",
        "vAlign"
    ];

    /**
     * Assigns type and styleAttributes
     *
     * @param type the supported type
     * @param additionalStyleAttributes the supported style attributes
     */
    constructor(readonly type: string, additionalStyleAttributes: string[]) {
        this.styleAttributes.push(...additionalStyleAttributes);
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
    abstract layout(layout: Layout, element: LayoutElement, position: Position, size: Size, id: string): Element[];
}
