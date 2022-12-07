import { Element } from "../../model/base";
import { LayoutElement, LayoutElementConfig, Position, Size, SizeConstraints } from "../layoutElement";
import { Layout } from "../layoutEngine";

/**
 * Layout config for span, does not handle actual layouting and measuring
 */
export class SpanLayoutConfig implements LayoutElementConfig {
    readonly styleAttributes: string[] = ["text", "fill", "fontFamily", "fontSize", "fontWeight", "fontStyle"];

    readonly type = "span";

    /**
     * Called to determine the size the element requires
     *
     * @param layout performs the layout
     * @param element the element to measure
     * @param constraints defines min and max size
     * @returns the calculated size
     */
    measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const styles = element.styles;
        styles.text = styles.text ?? "";
        styles.fontFamily = styles.fontFamily ?? layout.defaultFont.config.fontFamily;
        styles.fontSize = styles.fontSize ?? 16;
        return { width: 0, height: 0 };
    }

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
    layout(layout: Layout, element: LayoutElement, position: Position, size: Size, id: string): Element[] {
        throw new Error("not implemented");
    }
}
