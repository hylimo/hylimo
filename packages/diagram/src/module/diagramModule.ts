import {
    assign,
    DefaultModuleNames,
    Expression,
    fun,
    id,
    InterpreterModule,
    jsFun,
    literal,
    namedType,
    nullType,
    objectType,
    or,
    SemanticFieldNames,
    str,
    Type
} from "@hylimo/core";
import { AttributeConfig, LayoutElementConfig } from "../layout/layoutElement";
import { layouts } from "../layout/layouts";

/**
 * Gets a list of all known style attributes
 *
 * @returns the list of style attributes
 */
function computeAllStyleAttributes(): AttributeConfig[] {
    const styleAttributes = new Map<string, AttributeConfig>();
    for (const layout of layouts) {
        for (const styleAttribute of layout.styleAttributes) {
            styleAttributes.set(styleAttribute.name, styleAttribute);
        }
    }
    return [...styleAttributes.values()];
}

/**
 * Type for unset, default style values
 */
const styleValueType = namedType(objectType(new Map([["_type", literal("styleValue")]])), "unset | default");

/**
 * Creates the function to create a specific element
 *
 * @param element config of the element
 * @returns the function to create the element
 */
function createElementFunction(element: LayoutElementConfig): Expression {
    const allAttributes = [...element.attributes, ...element.styleAttributes];
    return jsFun(
        (args, context) => {
            args.setLocalField(SemanticFieldNames.SELF, { value: context.null }, context);
            args.setLocalField("type", { value: context.newString(element.type) }, context);
            args.setLocalField(
                SemanticFieldNames.PROTO,
                context.currentScope.getLocalField(elementProto, context),
                context
            );
            return args;
        },
        {
            docs: `
                Creates a new ${element.type} element
                Params:
                    ${allAttributes.map((attribute) => `-"${attribute.name}": ${attribute.description}`).join("\n")}
                Returns:
                    The created element
            `
        },
        [
            ...element.attributes.map<[string, Type]>((attr) => [attr.name, attr.type]),
            ...element.styleAttributes.map<[string, Type]>((attr) => [
                attr.name,
                or(nullType, attr.type, styleValueType)
            ])
        ]
    );
}

/**
 * The name of the field containing the selector prototype
 */
const selectorProto = "selectorProto";

/**
 * The name of the field containing the element prototype
 */
const elementProto = "elementProto";

/**
 * Diagram module providing standard diagram UI elements
 */
export const diagramModule: InterpreterModule = {
    name: "diagram",
    dependencies: [DefaultModuleNames.OBJECT],
    runtimeDependencies: [DefaultModuleNames.LIST, DefaultModuleNames.FUNCTION],
    expressions: [
        fun([
            id(SemanticFieldNames.THIS).assignField(
                elementProto,
                id("object").call({ name: "_type", value: str("element") })
            ),
            ...layouts.map((config) =>
                id(SemanticFieldNames.IT).assignField(config.type, createElementFunction(config))
            )
        ]).call(id(SemanticFieldNames.THIS)),
        assign(
            "point",
            fun(
                `
                    (x, y) = args
                    object(x = x, y = y)
                `,
                {
                    docs: `
                        Creates a new absolute point
                        Params:
                            - 0: the x coordinate
                            - 1: the y coordinate
                        Returns:
                            The created point (x,y)
                    `
                }
            )
        ),
        assign(
            "relative",
            fun(
                `
                    (target, x, y) = args
                    object(target = target, x = x, y = y)
                `,
                {
                    docs: `
                        Creates a new relative point
                        Params:
                            - 0: the target point of which the relative point is based
                            - 1: the x offset
                            - 2: the y offset
                        Returns:
                            The created point (targex,x,y)
                    `
                }
            )
        ),
        assign(
            "styles",
            fun([
                assign(selectorProto, id("object").call({ name: "_type", value: str("selectorProto") })),
                assign("default", id("object").call({ name: "_type", value: str("styleValue") })),
                assign(
                    "selector",
                    fun(
                        `
                            (type) = args
                            [docs = "Creates a new selector"] {
                                (value, callback) = args
                                this.selector = object(
                                    selectorType = type,
                                    selectorValue = value,
                                    styles = list(),
                                    ${computeAllStyleAttributes()
                                        .map((attr) => `${attr.name} = default`)
                                        .join(",")}
                                )
                                args.self.styles.add(selector)
                                selector.proto = ${selectorProto}
                                callback.callWithScope(selector)
                                selector
                            }
                        `,
                        {
                            docs: `
                                Creates a selector with a specific type
                                Params:
                                    - 0: the type of the selector
                                Returns:
                                    A function which can be used to create instances of the selector type
                            `
                        }
                    )
                ),
                fun(
                    `
                        (callback) = args
                        res = object(styles = list())
                        res.type = selector("type")
                        res.class = selector("class")
                        res.unset = object(_type = "styleValue")
                        res.default = default
                        callback.callWithScope(res)
                        res
                    `,
                    {
                        docs: `
                            Creates a new styles object. Use "cls" and "type" to create rules.
                            Returns:
                                The created styles object
                        `
                    }
                )
            ]).call()
        ),
        assign(
            "fontFamily",
            fun(
                `
                    (fontFamily) = args
                    object(
                        fontFamily = fontFamily,
                        normal = args.normal,
                        italic = args.italic,
                        bold = args.bold,
                        boldItalic = args.boldItalic
                    )
                `,
                {
                    docs: `
                        Creates a new font family.
                        Params:
                            - 0: the name of the font family
                            - "normal": the normal font, should be a font
                            - "italic": italic font
                            - "bold": bold font
                            - "boldItalic": bold italic font
                        Returns:
                            the created font family object
                    `
                }
            )
        ),
        assign(
            "font",
            fun(
                `
                    (url, name, variationSettings) = args
                    object(url = url, name = name, variationSettings = variationSettings)
                `,
                {
                    docs: `
                        Creates a new font, should be used with fontFamily.
                        Params:
                            - 0: the url where the font can be found, e.g. a google fonts url
                            - 1: if a collection font file is used, the name of the font to use
                            - 2: if a variation font file is used, either the name of the named
                                variation or an object with values for variation axes
                        Returns:
                            the created font object
                    `
                }
            )
        ),
        assign(
            "robotoFontFamily",
            fun(`
                fontFamily(
                    "roboto",
                    normal = font("https://cdn.jsdelivr.net/gh/google/fonts@HEAD/apache/roboto/static/Roboto-Regular.ttf"),
                    italic = font("https://cdn.jsdelivr.net/gh/google/fonts@HEAD/apache/roboto/static/Roboto-Italic.ttf"),
                    bold = font("https://cdn.jsdelivr.net/gh/google/fonts@HEAD/apache/roboto/static/Roboto-Bold.ttf"),
                    boldItalic = font("https://cdn.jsdelivr.net/gh/google/fonts@HEAD/apache/roboto/static/Roboto-BoldItalic.ttf")
                )
            `).call()
        ),
        assign(
            "diagram",
            fun(
                `
                    (element, stylesObject, fonts) = args
                    object(element = element, styles = stylesObject, fonts = fonts)
                `,
                {
                    docs: `
                        Creates a new diagram, consisting of a ui element, styles and fonts
                        Params:
                            - 0: the root ui element
                            - 1: the styles object created by the styles function
                            - 2: a list of font family objects
                        Returns:
                            the created diagram object
                    `
                }
            )
        )
    ]
};
