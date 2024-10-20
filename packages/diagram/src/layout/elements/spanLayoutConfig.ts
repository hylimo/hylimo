import { enumType, FullObject, nullType, numberType, stringType } from "@hylimo/core";
import { Element, FontStyle, FontWeight, Point, Size } from "@hylimo/diagram-common";
import { ContentCardinality, LayoutElement, SizeConstraints } from "../layoutElement.js";
import { Layout } from "../engine/layout.js";
import { ElementLayoutConfig } from "./elementLayoutConfig.js";
import { fillStyleAttributes } from "./attributes.js";

/**
 * Layout config for span, does not handle actual layouting and measuring
 */
export class SpanLayoutConfig extends ElementLayoutConfig {
    override type = "span";
    override contentType = nullType;
    override contentCardinality = ContentCardinality.ExactlyOne;

    /**
     * Creates a new SpanLayoutConfig
     */
    constructor() {
        super(
            [{ name: "text", description: "the text to display", type: stringType }],
            [
                ...fillStyleAttributes,
                {
                    name: "fontFamily",
                    description: "optional font family to use, must be registered font family name string",
                    type: stringType
                },
                { name: "fontSize", description: "optional font size to use", type: numberType },
                {
                    name: "fontWeight",
                    description: 'optional font weight, if given must be either "normal" or "bold"',
                    type: enumType(FontWeight)
                },
                {
                    name: "fontStyle",
                    description: 'optional font style, if given must be either "normal" or "italic"',
                    type: enumType(FontStyle)
                }
            ]
        );
    }

    override measure(layout: Layout, element: LayoutElement, _constraints: SizeConstraints): Size {
        const styles = element.styles;
        styles.text = element.element.getLocalFieldOrUndefined("text")!.value.toNative();
        styles.fontFamily = styles.fontFamily ?? layout.defaultFontFamily;
        styles.fontSize = styles.fontSize ?? 16;
        return { width: 0, height: 0 };
    }

    override layout(_layout: Layout, _element: LayoutElement, _position: Point, _size: Size, _id: string): Element[] {
        throw new Error("not implemented");
    }

    override getChildren(): FullObject[] {
        return [];
    }
}
