import {
    arg,
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
        args.setLocalField("type", { value: context.newString(type) }, context);
        return args;
    };
}

/**
 * Diagram module providing standard diagram UI elements
 */
export const listModule: InterpreterModule = {
    name: "diagram",
    dependencies: [],
    runtimeDependencies: [DefaultModuleNames.OBJECT],
    expressions: [
        assign(
            "Text",
            jsFun(assignTypeFunction("Text"), {
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
            "Span",
            jsFun(assignTypeFunction("Span"), {
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
            "Rect",
            jsFun(assignTypeFunction("Rect"), {
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
            "Ellipse",
            jsFun(assignTypeFunction("Ellipse"), {
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
            "Circle",
            jsFun(assignTypeFunction("Circle"), {
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
            "Path",
            jsFun(assignTypeFunction("Path"), {
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
            "HBox",
            jsFun(assignTypeFunction("HBox"), {
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
            "VBox",
            jsFun(assignTypeFunction("VBox"), {
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
            "Stack",
            jsFun(assignTypeFunction("Stack"), {
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
            "Canvas",
            jsFun(assignTypeFunction("Canvas"), {
                docs: `
                    Creates a new Canvas element with contents.
                    Contents should be CanvasContents which provide a position
                    Params:
                        - "contents": the inner elements
                        ${elementDoc}
                    Returns:
                        The created Canvas element
                `
            })
        ),
        assign(
            "CanvasContent",
            jsFun(assignTypeFunction("CanvasContent"), {
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
                [
                    id("object").call(
                        {
                            name: "x",
                            value: id(SemanticFieldNames.ARGS).field(0)
                        },
                        {
                            name: "y",
                            value: id(SemanticFieldNames.ARGS).field(1)
                        }
                    )
                ],
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
                [
                    id("object").call(
                        {
                            name: "target",
                            value: id(SemanticFieldNames.ARGS).field(0)
                        },
                        {
                            name: "x",
                            value: id(SemanticFieldNames.ARGS).field(1)
                        },
                        {
                            name: "y",
                            value: id(SemanticFieldNames.ARGS).field(2)
                        }
                    )
                ],
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
        )
    ]
};
