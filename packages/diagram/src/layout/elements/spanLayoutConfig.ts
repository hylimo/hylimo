import { literal, numberType, or, stringType } from "@hylimo/core";
import { Element, Point, Size } from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../layoutElement";
import { Layout } from "../layoutEngine";
import { BaseElementLayoutConfig } from "./baseElementLayoutConfig";

/**
 * Layout config for span, does not handle actual layouting and measuring
 */
export class SpanLayoutConfig extends BaseElementLayoutConfig {
    /**
     * Creates a new SpanLayoutConfig
     */
    constructor() {
        super(
            "span",
            [],
            [
                { name: "text", description: "the text to display", type: stringType },
                { name: "fill", description: "optional text color, must be a valid color string", type: stringType },
                {
                    name: "fontFamily",
                    description: "optional font family to use, must be registered font family name string",
                    type: stringType
                },
                { name: "fontSize", description: "optional font size to use", type: numberType },
                {
                    name: "fontWeight",
                    description: 'optional font weight, if given must be either "normal" or "bold"',
                    type: or(literal("normal"), literal("bold"))
                },
                {
                    name: "fontStyle",
                    description: 'optional font style, if given must be either "normal" or "italic"',
                    type: or(literal("normal"), literal("italic"))
                }
            ]
        );
    }

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
    layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        throw new Error("not implemented");
    }
}
