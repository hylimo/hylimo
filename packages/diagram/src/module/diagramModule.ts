import {
    assertFunction,
    assertObject,
    assign,
    DefaultModuleNames,
    ExecutableExpression,
    ExecutableInvocationArgument,
    fun,
    functionType,
    id,
    InterpreterModule,
    jsFun,
    literal,
    namedType,
    nullType,
    objectType,
    optional,
    or,
    SemanticFieldNames,
    str,
    stringType,
    Type,
    validate
} from "@hylimo/core";
import { openSans, roboto, sourceCodePro } from "@hylimo/fonts";
import { AttributeConfig, LayoutConfig } from "../layout/layoutElement";
import { layouts } from "../layout/layouts";

/**
 * Type for unset, default style values
 */
const styleValueType = namedType(objectType(new Map([["_type", or(literal("unset"), literal("var"))]])), "unset | var");

/**
 * Gets a list of all known style attributes
 *
 * @returns the list of style attributes
 */
function computeAllStyleAttributes(): AttributeConfig[] {
    const styleAttributes = new Map<string, AttributeConfig>();
    for (const layout of layouts) {
        for (const styleAttribute of layout.styleAttributes) {
            styleAttributes.set(styleAttribute.name, {
                name: styleAttribute.name,
                description: styleAttribute.description,
                type: or(nullType, styleAttribute.type, styleValueType)
            });
        }
    }
    return [...styleAttributes.values()];
}

/**
 * All style atributes
 */
const allStyleAttributes = computeAllStyleAttributes();

/**
 * Creates the function to create a specific element
 *
 * @param element config of the element
 * @returns the function to create the element
 */
function createElementFunction(element: LayoutConfig): ExecutableExpression {
    const allAttributes = [...element.attributes, ...element.styleAttributes];
    return jsFun(
        (args, context) => {
            args.setLocalField(SemanticFieldNames.SELF, { value: context.null });
            args.setLocalField("type", { value: context.newString(element.type) });
            args.setLocalField(SemanticFieldNames.PROTO, context.currentScope.getLocalField(elementProto, context));
            return args;
        },
        {
            docs: [
                `Creates a new ${element.type} element`,
                `Params:`,
                ...allAttributes.map((attribute) => `    - "${attribute.name}": ${attribute.description}`),
                `Returns:`,
                `    The created element`
            ].join("\n")
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
 * Type for a font object
 */
const fontType = objectType(
    new Map([
        ["url", stringType],
        ["name", optional(stringType)],
        ["variationSettings", optional(objectType())]
    ])
);

/**
 * Helper function to create a font object
 *
 * @param name the name of the style of the font
 * @param url the url of the font
 * @returns an invocation argument containing the font object
 */
function font(name: string, url: string): ExecutableInvocationArgument {
    return {
        name,
        value: id("font").call(str(url))
    };
}

/**
 * Diagram module providing standard diagram UI elements
 */
export const diagramModule = InterpreterModule.create(
    "diagram",
    [DefaultModuleNames.OBJECT],
    [DefaultModuleNames.LIST, DefaultModuleNames.FUNCTION, DefaultModuleNames.BOOLEAN],
    [
        fun([
            assign(elementProto, id("object").call({ name: "_type", value: str("element") })),
            ...layouts.map((config) =>
                id(SemanticFieldNames.IT).assignField(config.type, createElementFunction(config))
            )
        ]).call(id(SemanticFieldNames.THIS)),
        assign(
            "styles",
            fun([
                assign(selectorProto, id("object").call({ name: "_type", value: str("selectorProto") })),
                assign(
                    "validateSelector",
                    jsFun((args, context) => {
                        const value = args.getField(0, context);
                        const createFunction = args.getField(1, context);
                        assertObject(value);
                        assertFunction(createFunction);
                        for (const attribute of allStyleAttributes) {
                            const attributeValue = value.getLocalField(attribute.name, context).value;
                            validate(
                                attribute.type,
                                `Invalid value for ${attribute.name}`,
                                attributeValue,
                                context,
                                () => createFunction.definition
                            );
                        }
                        return context.null;
                    })
                ),
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
                                    variables = object(),
                                    ${allStyleAttributes.map((attr) => `${attr.name} = null`).join(",")}
                                )
                                args.self.styles.add(selector)
                                selector.proto = ${selectorProto}
                                callback.callWithScope(selector)
                                validateSelector(selector, callback)
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
                assign(
                    "vars",
                    fun(
                        `
                            (callback) = args
                            res = object()
                            callback.callWithScope(res)
                            args.self.any {
                                variables = this.variables
                                res.forEach {
                                    (value, key) = args
                                    variables.set(key, value)
                                }
                            }
                            null
                        `,
                        {
                            docs: `
                                Invokes the callback provided as first parameter, extracts all variables set in the callback
                                and sets all of them as variable values in a any selector.
                                Params:
                                    - 0: the callback to invoke
                                    - "self": the styles object
                                Returns:
                                    null
                            `
                        },
                        [[0, functionType]]
                    )
                ),
                assign(
                    "var",
                    fun(
                        `
                            (name) = args
                            object(name = name, _type = "var")
                        `,
                        {
                            docs: `
                                Creates a variable reference which can be used everywhere a style value is expected.
                                Params:
                                    - 0: the name of the variable
                                Returns:
                                    The created variable reference
                            `
                        },
                        [[0, stringType]]
                    )
                ),
                fun(
                    `
                        (callback) = args
                        res = object(styles = list())
                        res.type = selector("type")
                        res.class = selector("class")
                        anySelector = selector("any")
                        res.any = { 
                            anySelector("", it, self = args.self)
                        }
                        res.unset = object(_type = "unset")
                        res.vars = vars
                        res.var = var
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
                },
                [
                    [0, stringType],
                    ["normal", fontType],
                    ["italic", fontType],
                    ["bold", fontType],
                    ["boldItalic", fontType]
                ]
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
                },
                [
                    [0, stringType],
                    [1, optional(stringType)],
                    [2, optional(objectType())]
                ]
            )
        ),
        assign(
            "defaultFonts",
            id("object").call(
                {
                    name: "roboto",
                    value: id("fontFamily").call(
                        str("Roboto"),
                        font("normal", roboto.regular),
                        font("italic", roboto.italic),
                        font("bold", roboto.bold),
                        font("boldItalic", roboto.boldItalic)
                    )
                },
                {
                    name: "openSans",
                    value: id("fontFamily").call(
                        str("Open Sans"),
                        font("normal", openSans.regular),
                        font("italic", openSans.italic),
                        font("bold", openSans.bold),
                        font("boldItalic", openSans.boldItalic)
                    )
                },
                {
                    name: "sourceCodePro",
                    value: id("fontFamily").call(
                        str("Source Code Pro"),
                        font("normal", sourceCodePro.regular),
                        font("italic", sourceCodePro.italic),
                        font("bold", sourceCodePro.bold),
                        font("boldItalic", sourceCodePro.boldItalic)
                    )
                }
            )
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
);
