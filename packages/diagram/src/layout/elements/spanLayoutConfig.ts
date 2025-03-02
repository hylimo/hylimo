import type { FullObject } from "@hylimo/core";
import { booleanType, enumType, nullType, numberType, or, stringType } from "@hylimo/core";
import type { Element, Point, Size } from "@hylimo/diagram-common";
import { FontStyle, FontWeight } from "@hylimo/diagram-common";
import type { LayoutElement, SizeConstraints } from "../layoutElement.js";
import { ContentCardinality } from "../layoutElement.js";
import type { Layout } from "../engine/layout.js";
import { ElementLayoutConfig } from "./elementLayoutConfig.js";
import { fillStyleAttributes } from "./attributes.js";

/**
 * Layout config for span, does not handle actual layouting and measuring
 */
export class SpanLayoutConfig extends ElementLayoutConfig {
    override type = "span";

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
                },
                {
                    name: "underline",
                    description: "optional underline, must be a valid color string or boolean (fill color used)",
                    type: or(stringType, booleanType)
                },
                {
                    name: "underlineOpacity",
                    description: "optional underline opacity, must be a number between 0 and 1",
                    type: numberType
                },
                { name: "underlineWidth", description: "optional width of the underline", type: numberType },
                {
                    name: "underlineDash",
                    description: "optional dash length. If not set, underline is solid.",
                    type: numberType
                },
                {
                    name: "underlineDashSpace",
                    description: "space between dashes, only used if underlineDash is set, defaults to underlineDash",
                    type: numberType
                },
                {
                    name: "strikethrough",
                    description: "optional strikethrough, must be a valid color string or boolean (fill color used)",
                    type: or(stringType, booleanType)
                },
                {
                    name: "strikethroughOpacity",
                    description: "optional strikethrough opacity, must be a number between 0 and 1",
                    type: numberType
                },
                { name: "strikethroughWidth", description: "optional width of the strikethrough", type: numberType },
                {
                    name: "strikethroughDash",
                    description: "optional dash length. If not set, strikethrough is solid.",
                    type: numberType
                },
                {
                    name: "strikethroughDashSpace",
                    description:
                        "space between dashes, only used if strikethroughDash is set, defaults to strikethroughDash",
                    type: numberType
                }
            ],
            nullType,
            ContentCardinality.None
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
