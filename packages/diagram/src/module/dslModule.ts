import { assign, DefaultModuleNames, fun, functionType, id, InterpreterModule, optional, parse } from "@hylimo/core";

/**
 * Identifier for the scope variable
 */
const scope = "scope";

/**
 * Module which provides common DSL functionality
 */
export const dslModule: InterpreterModule = {
    name: "dsl",
    dependencies: [],
    runtimeDependencies: [
        DefaultModuleNames.OBJECT,
        DefaultModuleNames.LIST,
        DefaultModuleNames.FUNCTION,
        DefaultModuleNames.BOOLEAN,
        "diagram"
    ],
    expressions: [
        assign(
            "generateDiagramEnvironment",
            fun(
                [
                    ...parse("scopeEnhancer = it ?? { }"),
                    fun([
                        ...parse(
                            `
                                callback = it
                                ${scope} = object(_styles = styles({ }), fonts = list(), contents = list(), _classCounter = 0)
                            `
                        ),
                        id(scope).assignField(
                            "apos",
                            fun(
                                `
                                    (x, y) = args
                                    point = absolutePoint(x = x, y = y)
                                    scope.contents += point
                                    point
                                `,
                                {
                                    docs: `
                                        Create a absolute point
                                        Params:
                                            - 0: the x coordinate
                                            - 1: the y coordinate
                                        Returns:
                                            The created absolute point
                                    `
                                }
                            )
                        ),
                        id(scope).assignField(
                            "rpos",
                            fun(
                                `
                                    (target, offsetX, offsetY) = args
                                    point = relativePoint(target = target, offsetX = offsetX, offsetY = offsetY)
                                    scope.contents += point
                                    point
                                `,
                                {
                                    docs: `
                                        Create a relative point
                                        Params:
                                            - 0: the target to which the point is relative
                                            - 1: the x coordinate
                                            - 2: the y coordinate
                                        Returns:
                                            The created relative point
                                    `
                                }
                            )
                        ),
                        id(scope).assignField(
                            "lpos",
                            fun(
                                `
                                    (lineProvider, pos) = args
                                    point = linePoint(lineProvider = lineProvider, pos = pos)
                                    scope.contents += point
                                    point
                                `,
                                {
                                    docs: `
                                        Create a line point
                                        Params:
                                            - 0: the line provider
                                            - 1: the relative position on the line, number between 0 and 1
                                        Returns:
                                            The created line point
                                    `
                                }
                            )
                        ),
                        id(scope).assignField(
                            "styles",
                            fun(
                                `
                                    (first, second) = args
                                    if(second != null) {
                                        className = "canvas-element-" + scope._classCounter
                                        scope._classCounter = scope._classCounter + 1
                                        if (first.class == null) {
                                            first.class = list(className)
                                        } {
                                            first.class += className
                                        }
                                        first.scopes.styles = second
                                        stylesToAdd = styles(second).styles
                                        scope.styles {
                                            class(className) {
                                                styles.addAll(stylesToAdd)
                                            }
                                        }
                                        first
                                    } {
                                        resultStyles = styles(first)
                                        scope._styles.styles.addAll(resultStyles.styles)
                                    }
                                `,
                                {
                                    docs: `
                                        Style function which can either be used globally with one parameter
                                        or applied as operator to some (graphical) element
                                        Params:
                                            - 0: either the element or the callback which contains the style definition
                                            - 1: if an element was provided for 0, the callback
                                        Returns:
                                            The provided object if or null if none was provided
                                    `
                                }
                            )
                        ),
                        assign(
                            "canvasElementLayout",
                            fun(
                                `
                                    (self, callback) = args
                                    result = object()
                                    callback.callWithScope(result)
                                    if (result.pos != null) {
                                        self.pos = result.pos
                                    }
                                    if (result.width != null) {
                                        self.width = result.width
                                    }
                                    if (result.height != null) {
                                        self.height = result.height
                                    }
                                `
                            )
                        ),
                        id(scope).assignField(
                            "layout",
                            fun(
                                `
                                    (self, callback) = args
                                    self.scopes.layout = callback
                                    if (self.type == "canvasElement") {
                                        canvasElementLayout(self, callback)
                                    } {
                                        if (self.type == "canvasConnection") {

                                        } {
                                            error("cannot apply layout to " + self.type)
                                        }
                                    }
                                    self
                                `,
                                {
                                    docs: `
                                        Layout operator which can be applied either to a CanvasElement or a CanvasConnection
                                        Params:
                                            - 0: the CanvasElement or CanvasConnection to ally the layout to
                                            - 1: callback which provides the layout definition
                                        Returns:
                                            The provided element
                                    `
                                }
                            )
                        ),
                        ...parse(
                            `
                                scopeEnhancer(scope)
                                callback.callWithScope(scope)
                                diagramCanvas = canvas(contents = scope.contents)
                                diagram(diagramCanvas, scope._styles, scope.fonts)
                            `
                        )
                    ])
                ],
                {
                    docs: `
                        Creates a function which can be then used as a DSL function to create a diagram.
                        The function takes a callback, which is invoked with a custom scope.
                        By default, in this scope exist
                            - styles: function to add more styles, can be called multiple times
                                      can also be used as operator after an element
                            - layout: function which takes a CanvasElement and applies pos, width and height to it
                            - contents: list of elements used as contents of the canvas
                            - pos: takes two positional parameters and creates a new absolutePoint
                            - fonts: list of fonts
                        Additional function can be provided using the scopeEnhancer.
                        The function than uses styles, fonts and contents to create and return the diagram
                        Params:
                            - 0: the scope enhancer, a function which takes the scope and can modify it, optional
                        Returns:
                            The diagram DSL function
                    `
                },
                [[0, optional(functionType)]]
            )
        )
    ]
};
