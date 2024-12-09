import {
    assign,
    BaseObject,
    booleanType,
    DefaultModuleNames,
    ExecutableConstExpression,
    ExecutableExpression,
    ExecutableListEntry,
    FullObject,
    fun,
    functionType,
    id,
    InterpreterModule,
    isObject,
    isString,
    jsFun,
    listType,
    literal,
    namedType,
    nullType,
    num,
    objectType,
    optional,
    or,
    SemanticFieldNames,
    str,
    stringType
} from "@hylimo/core";
import { openSans, roboto, sourceCodePro } from "@hylimo/fonts";
import { AttributeConfig, ContentCardinality, LayoutConfig } from "../../layout/layoutElement.js";
import { layouts } from "../../layout/layouts.js";
import { elementType, validateScope } from "./types.js";
import { DiagramModuleNames } from "../diagramModuleNames.js";
import { LayoutEngine } from "../../layout/engine/layoutEngine.js";

/**
 * Type for unset, default style values
 */
const styleValueType = namedType(
    objectType(new Map([["_type", or(literal("unset"), literal("var"), literal("calc"))]])),
    "unset | var | calc"
);

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
export const allStyleAttributes = computeAllStyleAttributes();

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
                const newElement = context.newObject();
                newElement.setLocalField("type", { value: context.newString(element.type) }, context);
                newElement.setLocalField("proto", { value: context.getField("elementProto") }, context);
                newElement.setLocalField("edits", { value: context.newObject() }, context);
                for (const [key, value] of args.fields.entries()) {
                    if (key !== "self" && key !== "proto") {
                        newElement.setField(key, value, context);
                    }
                }
                context.getField("_evaluateElement").invoke(
                    [
                        {
                            value: new ExecutableConstExpression({ value: newElement })
                        },
                        {
                            value: new ExecutableConstExpression({ value: args })
                        },
                        {
                            value: num(cardinalityNumber)
                        }
                    ],
                    context
                );
                return newElement;
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
 * The list of operators that have a proxy implementation
 * on the selector prototype to support calculated style values
 */
const selectorProxiedOperators = ["+", "-", "*", "/", "%", "&", "|", ">", ">=", "<", "<=", ">>", "<<"];

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
 * Checks if a value is a var or calc object
 *
 * @param value the value to check
 * @returns true if the value is a var or calc object
 */
function isVarOrCalc(value: BaseObject) {
    if (!isObject(value)) {
        return false;
    }
    const type = value.getLocalFieldOrUndefined("_type")?.value;
    if (type == undefined || !isString(type)) {
        return false;
    }
    return type.value === "var" || type.value === "calc";
}

/**
 * Diagram module providing default diagram UI elements
 */
export class DiagramModule implements InterpreterModule {
    /**
     * Creates a new diagram module
     *
     * @param layoutEngine the layout engine to use for layouting
     */
    constructor(readonly layoutEngine: LayoutEngine) {}

    name = DiagramModuleNames.DIAGRAM;
    dependencies = [...Object.values(DefaultModuleNames), DiagramModuleNames.EDIT];
    runtimeDependencies = [];
    expressions = [
        fun([
            assign("_elementProto", id("object").call({ name: "_type", value: str("element") })),
            assign(
                "_evaluateElement",
                fun(
                    `
                        (element, elementArgs, contentsCardinality) = args
                        
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
                        const value = args.getFieldValue(0, context);
                        validateScope(value, context, allStyleAttributes);
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
                                validateSelector(selector)
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
                `
                    this.type = selector("type")
                    this.cls = selector("class")
                    this.anySelector = selector("any")
                    this.any = {
                        this.anySelector("", it, self = args.self)
                    }
                `,
                fun(
                    [
                        `
                            (callback, res, validateStyles) = args
                            this.stylesArgs = args
                            res.type = type
                            res.cls = cls
                            res.any = any
                            res.vars = vars
                        `,
                        ...selectorProxiedOperators.map((operator) =>
                            id("res").assignField(
                                operator,
                                jsFun(
                                    (args, context) => {
                                        const left = args.getField(0, context);
                                        const right = args.getField(1, context);
                                        const executableOperator = context
                                            .getField("stylesArgs")
                                            .getFieldValue("self", context)
                                            .getField(operator, context);
                                        if (isVarOrCalc(left.value) || isVarOrCalc(right.value)) {
                                            const result = context.newObject();
                                            result.setLocalField(
                                                "_type",
                                                { value: context.newString("calc") },
                                                context
                                            );
                                            result.setLocalField("left", left, context);
                                            result.setLocalField("right", right, context);
                                            result.setLocalField("operator", executableOperator, context);
                                            return result;
                                        }
                                        return executableOperator.value.invoke(
                                            [
                                                { value: new ExecutableConstExpression(left) },
                                                { value: new ExecutableConstExpression(right) }
                                            ],
                                            context
                                        );
                                    },
                                    {
                                        docs: `The ${operator} operator, expects two arguments, calls ${operator} on the first argument with the second argument.`,
                                        params: [
                                            [0, `the target where ${operator} is invoked`],
                                            [1, `the value passed to the ${operator} function`]
                                        ],
                                        returns: `The result of the invocation of ${operator} on the first argument`
                                    }
                                )
                            )
                        ),
                        `
                            callback.callWithScope(res)
                            if(validateStyles == true) {
                                validateSelector(res, callback)
                            }
                            res
                        `
                    ],
                    {
                        docs: 'Creates a new styles object. Use "cls", "type", and "any" to create rules.',
                        params: [
                            [0, "the callback to invoke", functionType],
                            [1, "the scope object to use which is provided to the callback end returned", objectType()],
                            [2, "validate style attributes", optional(booleanType)]
                        ],
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
                    (url, variationSettings) = args
                    object(url = url, variationSettings = variationSettings)
                `,
                {
                    docs: "Creates a new font, should be used with fontFamily.",
                    params: [
                        [0, "the url where the font can be found, e.g. a google fonts url", stringType],
                        [
                            1,
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
            jsFun(
                (args, context) => {
                    const layoutWithRoot = this.layoutEngine.createLayout(
                        args.getField(0, context).value as FullObject,
                        args.getField(1, context).value as FullObject,
                        args.getField(2, context).value as FullObject,
                        context
                    );
                    return context.newWrapperObject(layoutWithRoot, new Map());
                },
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
    ];
}
