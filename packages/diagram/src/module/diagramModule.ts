import {
    assertFunction,
    assertObject,
    assign,
    DefaultModuleNames,
    ExecutableConstExpression,
    ExecutableExpression,
    ExecutableListEntry,
    ExecutableNumberLiteralExpression,
    ExecutableStringLiteralExpression,
    fun,
    functionType,
    id,
    InterpreterModule,
    jsFun,
    listType,
    literal,
    namedType,
    nullType,
    objectType,
    optional,
    or,
    SemanticFieldNames,
    str,
    stringType,
    validate
} from "@hylimo/core";
import { openSans, roboto, sourceCodePro } from "@hylimo/fonts";
import { AttributeConfig, ContentCardinality, LayoutConfig } from "../layout/layoutElement.js";
import { layouts } from "../layout/layouts.js";
import { elementType } from "./types.js";

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
 * Creates a function which evaluates to the function to create a specific element
 *
 * @param element config of the element
 * @returns the callback which provides the create element function
 */
function createElementFunction(element: LayoutConfig): ExecutableExpression {
    const { cardinalityNumber, contentAttributes } = extractContentAttributeAndCardinality(element);

    return fun([
        id(SemanticFieldNames.THIS).assignField(
            "elementProto",
            element.createPrototype().call(id(SemanticFieldNames.IT))
        ),
        jsFun(
            (args, context) => {
                return context.getField("_evaluateElement").invoke(
                    [
                        {
                            value: new ExecutableConstExpression({ value: args })
                        },
                        {
                            value: new ExecutableStringLiteralExpression(undefined, element.type)
                        },
                        {
                            value: new ExecutableNumberLiteralExpression(undefined, cardinalityNumber)
                        },
                        {
                            value: id("elementProto")
                        }
                    ],
                    context
                );
            },
            {
                docs: `Creates a new ${element.type} element`,
                params: [
                    ...element.attributes.map((attr) => [attr.name, attr.description, attr.type] as const),
                    ...element.styleAttributes.map(
                        (attr) => [attr.name, attr.description, or(nullType, attr.type, styleValueType)] as const
                    ),
                    ...contentAttributes.map((attr) => [attr.name, attr.description, optional(attr.type)] as const),
                    [0, "builder scope function", optional(functionType)]
                ],
                returns: "the created element"
            }
        )
    ]);
}

/**
 * Extracts the content attribute and cardinality from the element
 *
 * @param element the element to extract the content attribute and cardinality from
 * @returns the cardinality number and the content attributes
 */
function extractContentAttributeAndCardinality(element: LayoutConfig): {
    cardinalityNumber: number;
    contentAttributes: AttributeConfig[];
} {
    const contentCardinality = element.contentCardinality;
    const contentAttributes: AttributeConfig[] = [];
    const isOneContent =
        contentCardinality === ContentCardinality.ExactlyOne || contentCardinality === ContentCardinality.Optional;
    const isManyContent =
        contentCardinality === ContentCardinality.Many || contentCardinality === ContentCardinality.AtLeastOne;
    let cardinalityNumber = 0;
    if (isOneContent) {
        contentAttributes.push({
            name: "content",
            description: "the content of the element",
            type: element.contentType
        });
        cardinalityNumber = 1;
    } else if (isManyContent) {
        contentAttributes.push({
            name: "contents",
            description: "the contents of the element",
            type: listType(element.contentType)
        });
        cardinalityNumber = Number.POSITIVE_INFINITY;
    }
    return { cardinalityNumber, contentAttributes };
}

/**
 * The name of the field containing the selector prototype
 */
const selectorProto = "selectorProto";

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
function font(name: string, url: string): ExecutableListEntry {
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
    [DefaultModuleNames.COMMON, DefaultModuleNames.LIST, DefaultModuleNames.OPERATOR],
    [],
    [
        fun([
            assign("_elementProto", id("object").call({ name: "_type", value: str("element") })),
            assign(
                "_evaluateElement",
                fun(
                    `
                        (elementArgs, type, contentsCardinality, elementProto) = args
                        this.element = object(type = type, proto = elementProto)
                        elementArgs.forEach {
                            (value, key) = args
                            if ((key != "self") && (key != "proto")) {
                                this.element.set(key, value)
                            }
                        }
                        
                        this.scope = elementArgs.self
                        if(contentsCardinality > 0) {
                            this.callback = elementArgs.get(0)
                            if(callback != null) {
                                scopeObject = object()
                                if(contentsCardinality == 1) {
                                    scopeObject.addContent = {
                                        element.content = it
                                    }
                                } {
                                    scopeObject.addContent = {
                                        this.content = it
                                        this.element = element
                                        if(element.contents == null) {
                                            element.contents = list(content)
                                        } {
                                            element.contents.add(content)
                                        }
                                    }
                                }
                                callback.callWithScope(scopeObject)
                            }
                        }
                        if(scope.addContent != null) {
                            scope.addContent(element)
                        }
                        element
                    `
                )
            ),
            ...layouts.map((config) =>
                id(SemanticFieldNames.IT).assignField(
                    config.type,
                    createElementFunction(config).call(id("_elementProto"))
                )
            )
        ]).call(id(SemanticFieldNames.THIS)),
        assign(
            "var",
            fun(
                `
                    (name) = args
                    object(name = name, _type = "var")
                `,
                {
                    docs: "Creates a variable reference which can be used everywhere a style value is expected.",
                    params: [[0, "the name of the variable", stringType]],
                    returns: "The created variable reference"
                }
            )
        ),
        assign("unset", id("object").call({ name: "_type", value: str("unset") })),
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
                            {
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
                            docs: "Creates a selector with a specific type",
                            params: [[0, "the type of the selector"]],
                            returns: "A function which can be used to create instances of the selector type"
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
                            docs: "Invokes the callback provided as first parameter, extracts all variables set in the callback and sets all of them as variable values in a any selector.",
                            params: [
                                [0, "the callback to invoke", functionType],
                                [SemanticFieldNames.SELF, "the styles object"]
                            ],
                            returns: "null"
                        }
                    )
                ),
                fun(
                    `
                        (callback) = args
                        res = object(styles = list())
                        res.type = selector("type")
                        res.cls = selector("class")
                        anySelector = selector("any")
                        res.any = { 
                            anySelector("", it, self = args.self)
                        }
                        res.vars = vars
                        callback.callWithScope(res)
                        res
                    `,
                    {
                        docs: 'Creates a new styles object. Use "cls" and "type" to create rules.',
                        params: [],
                        returns: "The created styles object"
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
                    docs: "Creates a new font family.",
                    params: [
                        [0, "the name of the font family", stringType],
                        ["normal", "the normal font, should be a font", fontType],
                        ["italic", "italic font", fontType],
                        ["bold", "bold font", fontType],
                        ["boldItalic", "bold italic font", fontType]
                    ],
                    returns: "the created font family object"
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
                    docs: "Creates a new font, should be used with fontFamily.",
                    params: [
                        [0, "the url where the font can be found, e.g. a google fonts url", stringType],
                        [1, "if a collection font file is used, the name of the font to use", optional(stringType)],
                        [
                            2,
                            "if a variation font file is used, either the name of the named variation or an object with values for variation axes",
                            optional(objectType())
                        ]
                    ],
                    returns: "the created font object"
                }
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
            "createDiagram",
            fun(
                `
                    (element, stylesObject, fonts) = args
                    object(element = element, styles = stylesObject, fonts = fonts)
                `,
                {
                    docs: "Creates a new diagram, consisting of a ui element, styles and fonts",
                    params: [
                        [0, "the root ui element", elementType()],
                        [1, "the styles object created by the styles function", objectType()],
                        [2, "a list of font family objects", listType(objectType())]
                    ],
                    returns: "the created diagram object"
                }
            )
        )
    ]
);
