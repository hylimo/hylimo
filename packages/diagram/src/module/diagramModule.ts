import {
    assign,
    DefaultModuleNames,
    FullObject,
    fun,
    id,
    InterpreterContext,
    InterpreterModule,
    jsFun,
    SemanticFieldNames
} from "@hylimo/core";

/**
 * Documentation for everything which can have style fields
 */
const baseElementDoc = `
    - "class": classes, can be used for styling
`;

/**
 * Documentation for Element fields
 */
const elementDoc =
    baseElementDoc +
    `
    - "width": optional width of the element, must be a number
    - "height": optional height of the element, must be a number
    - "minWidth": optional minimal width of the element, must be a number
    - "minHeight": optional minimal height of the element, must be a number
    - "maxWidth": optional maximal width of the element, must be a number
    - "maxHeight": optional maximal height of the element, must be a number
    - "marginTop": optional top margin of the element, must be a number
    - "marginRight": optional right margin of the element, must be a number
    - "marginBottom": optional bottom margin of the element, must be a number
    - "marginLeft": optional left margin of the element, must be a number
    - "margin": optional margin of the element, must be a number
    - "horizontalAlignment": optional horizontal alignment, must be one of "left", "right", "center" or "fill"
    - "verticalAlignment": optional vertical alignment, must be one of "top", "bottom", "center" or "fill"
`;

/**
 * Documentation for shape Element fields
 */
const shapeDoc =
    elementDoc +
    `
    - "fill": optional fill of the shape, must be a valid color string
    - "fillOpacity": optional fill opacity , must be a number between 0 and 1
    - "stroke": optional stroke, must be a valid color string
    - "strokeOpacity": optional stroke opacity, must be a number between 0 and 1
    - "strokeWidth": optional width of the stroke
    - "strokeDash": optional stroke dash, must be a StrokeDash
`;

/**
 * Creates an identity function which also assigns the type to the args before it returns it
 *
 * @param type the type of the UI element
 * @returns the function which assigns the type
 */
function assignTypeFunction(type: string): (args: FullObject, context: InterpreterContext) => FullObject {
    return (args, context) => {
        args.setLocalField(SemanticFieldNames.SELF, { value: context.null }, context);
        args.setLocalField("type", { value: context.newString(type) }, context);
        return args;
    };
}

/**
 * The name of the field containing the selector prototype
 */
const selectorProto = "selectorProto";

/**
 * Diagram module providing standard diagram UI elements
 */
export const diagramModule: InterpreterModule = {
    name: "diagram",
    dependencies: [DefaultModuleNames.OBJECT],
    runtimeDependencies: [DefaultModuleNames.LIST, DefaultModuleNames.FUNCTION],
    expressions: [
        assign(
            "text",
            jsFun(assignTypeFunction("text"), {
                docs: `
                    Creates a new Text element with the specified Spans
                    Params:
                        - "contents": A list of Spans to display
                        ${elementDoc}
                    Returns:
                        The created Text element
                `
            })
        ),
        assign(
            "span",
            jsFun(assignTypeFunction("span"), {
                docs: `
                    Creates a new Span
                    Params:
                        - "text": The text to display
                        - "foreground": optional text color, must be a valid color string
                        - "fontFamily": optional font family to use, must be registered font family name string
                        - "fontSize": optional font size to use
                        - "fontWeight": optional font weight, if given must be either "normal" or "bold"
                        - "fontStyle": optional font style, if given must be either "normal" or "italic"
                        ${baseElementDoc}
                    Returns:
                        The created Span element
                `
            })
        ),
        assign(
            "rect",
            jsFun(assignTypeFunction("rect"), {
                docs: `
                    Creates a new Rect element with a content
                    Params:
                        - "content": The content of the Rect
                        ${shapeDoc}
                    Returns:
                        The created Rect element
                `
            })
        ),
        assign(
            "ellipse",
            jsFun(assignTypeFunction("ellipse"), {
                docs: `
                    Creates a new Ellipse element with a content
                    Params:
                        - "content": The content of the Ellipse
                        ${shapeDoc}
                    Returns:
                        The created Ellipse element
                `
            })
        ),
        assign(
            "circle",
            jsFun(assignTypeFunction("circle"), {
                docs: `
                    Creates a new Circle element with a content
                    Params:
                        - "content": The content of the Circle
                        ${shapeDoc}
                    Returns:
                        The created Circle element
                `
            })
        ),
        assign(
            "path",
            jsFun(assignTypeFunction("path"), {
                docs: `
                    Creates a new Rect element with a content
                    Params:
                        - "path": the SVG path string to display
                        ${shapeDoc}
                    Returns:
                        The created Rect element
                `
            })
        ),
        assign(
            "hbox",
            jsFun(assignTypeFunction("hbox"), {
                docs: `
                    Creates a new HBox element with a content.
                    Stacks contents from left to right.
                    Params:
                        - "contents": the inner elements, stacked from left to right
                        ${elementDoc}
                    Returns:
                        The created HBox element
                `
            })
        ),
        assign(
            "vbox",
            jsFun(assignTypeFunction("vbox"), {
                docs: `
                    Creates a new VBox element with a content.
                    Stacks contents from top to bottom
                    Params:
                        - "contents": the inner elements. stacked from top to bottom
                        ${elementDoc}
                    Returns:
                        The created VBox element
                `
            })
        ),
        assign(
            "stack",
            jsFun(assignTypeFunction("stack"), {
                docs: `
                    Creates a new Stack element with a content.
                    Stacks contents from top to bottom
                    Params:
                        - "contents": the inner elements
                        ${elementDoc}
                    Returns:
                        The created VBox element
                `
            })
        ),
        assign(
            "canvas",
            jsFun(assignTypeFunction("canvas"), {
                docs: `
                    Creates a new Canvas element with contents.
                    Contents should be positioned which provide a position and an element
                    Params:
                        - "contents": the inner elements
                        ${elementDoc}
                    Returns:
                        The created Canvas element
                `
            })
        ),
        assign(
            "positioned",
            jsFun(assignTypeFunction("positioned"), {
                docs: `
                    Creates a new CanvasContent element with a content.
                    Should be used inside a Canvas.
                    Params:
                        - "content": the inner element
                        - "position": the absolute or relative position of the element
                        ${elementDoc}
                    Returns:
                        The created Canvas element
                `
            })
        ),
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
                assign(selectorProto, id("object").call()),
                assign(
                    "selector",
                    fun(
                        `
                            (type) = args
                            [docs = "Creates a new selector"] {
                                (value, callback) = args
                                this.selector = object(selectorType = type, selectorValue = value, styles = list())
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
                            - "italic": optional italic font
                            - "bold": optional bold font
                            - "boldItalic": optional bold italic font
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
