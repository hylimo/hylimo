import {
    AbstractFunctionObject,
    assign,
    DefaultModuleNames,
    Expression,
    fun,
    functionType,
    id,
    InterpreterModule,
    native,
    optional,
    parse
} from "@hylimo/core";

/**
 * Identifier for the scope variable
 */
const scope = "scope";

/**
 * Expressions which create the initial scope which is passed to the callback of all diagram DSL functions
 */
const scopeExpressions: Expression[] = [
    ...parse(
        `
            callback = it
            ${scope} = object(
                _styles = styles({ }),
                fonts = list(defaultFonts.roboto, defaultFonts.openSans, defaultFonts.sourceCodePro),
                contents = list(),
                _classCounter = 0
            )
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
                (lineProvider, pos, distance) = args
                point = linePoint(lineProvider = lineProvider, pos = pos, distance = distance)
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
                    className = "canvas-content-" + scope._classCounter
                    scope._classCounter = scope._classCounter + 1
                    if (first.class == null) {
                        first.class = list(className)
                    } {
                        first.class += className
                    }
                    first.scopes.styles = second
                    scope.styles {
                        class(className) {
                            this.any = any
                            this.class = class
                            this.type = type
                            this.unset = unset
                            this.var = var
                            this.vars = vars
                            second.callWithScope(this)
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
                result = object(pos = null, width = null, height = null, rotation = null)
                callback.callWithScope(result)
                if(result.pos != null) {
                    self.pos = result.pos
                }
                if(result.width != null) {
                    self.width = result.width
                }
                if(result.height != null) {
                    self.height = result.height
                }
                if(result.rotation != null) {
                    self.rotation = result.rotation
                }
            `,
            {
                docs: `
                    Helper for which applies a layout operator to a CanvasElement.
                    Handles pos, width and height.
                    Params:
                        - 0: the CanvasElement to which to apply the layout
                        - 1: the callback providing pos, width and height
                    Returns:
                        undefined
                `
            }
        )
    ),
    ...parse(
        `
            lineBuilderProto = object()
            lineBuilderProto.line = listWrapper {
                segments = args.self.segments
                it.forEach {
                    segments += canvasLineSegment(end = it)
                }
                args.self
            }
            lineBuilderProto.axisAligned = listWrapper {
                segments = args.self.segments
                positions = it
                range(positions.length / 2).forEach {
                    segments += canvasAxisAlignedSegment(
                        end = positions.get(2 * it + 1),
                        verticalPos = positions.get(2 * it)
                    )
                }
                args.self
            }
            lineBuilderProto.bezier = listWrapper {
                self = args.self
                segments = self.segments
                positions = it
                segmentCount = (positions.length - 2) / 3
                startPoint = if(segments.length > 0) {
                    segments.get(segments.length - 1).end
                } {
                    self.start
                }

                range(segmentCount - 1).forEach {
                    endPoint = positions.get(3 * it + 2)
                    segments += canvasBezierSegment(
                        startControlPoint = scope.rpos(
                            startPoint,
                            positions.get(3 * it),
                            positions.get(3 * it + 1)
                        ),
                        endControlPoint = scope.rpos(
                            endPoint,
                            -(positions.get(3 * it + 3)),
                            -(positions.get(3 * it + 4))
                        ),
                        end = endPoint
                    )
                    startPoint = endPoint
                }

                endPoint = positions.get(3 * segmentCount - 1)
                segments += canvasBezierSegment(
                    startControlPoint = scope.rpos(
                        startPoint,
                        positions.get(3 * segmentCount - 3),
                        positions.get(3 * segmentCount - 2)
                    ),
                    endControlPoint = scope.rpos(
                        endPoint,
                        positions.get(3 * segmentCount),
                        positions.get(3 * segmentCount + 1)
                    ),
                    end = endPoint
                )
                self
            }
        `
    ),
    assign(
        "canvasConnectionLayout",
        fun(
            `
                (self, callback) = args
                result = object(
                    over = null,
                    end = self.endProvider,
                    start = {
                        pos = self.startProvider(it)
                        object(proto = lineBuilderProto, segments = list(), start = pos)
                    },
                    label = {
                        (labelText, pos, distance, rotation) = args
                        labelCanvasElement = canvasElement(
                            content = text(
                                contents = list(span(text = labelText)),
                                class = list("label")
                            ),
                            pos = scope.lpos(self, pos ?? 0, distance),
                            rotation = rotation,
                            scopes = object(),
                            class= list("label-element")
                        )
                        scope.contents += labelCanvasElement
                        labelCanvasElement
                    }
                )
                callback.callWithScope(result)
                if(result.over != null) {
                    segments = result.over.segments
                    if((segments == null) || (segments.length == 0)) {
                        error("over must define at least one segment")
                    }
                    self.start = result.over.start
                    self.contents = result.over.segments
                }
            `,
            {
                docs: `
                    Helper for which applies a layout operator to a CanvasConnection.
                    Handles the routing points.
                    Params:
                        - 0: the CanvasConnection to which to apply the layout
                        - 1: the callback providing the new route via the field over
                    Returns:
                        undefined
                `
            }
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
                        canvasConnectionLayout(self, callback)
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
    assign(
        "_createConnection",
        fun(
            `
                (start, end, class) = args
                startMarkerFactory = args.startMarkerFactory
                endMarkerFactory = args.endMarkerFactory
                startPoint = start
                startProvider = if((start.type == "canvasElement") || (start.type == "canvasConnection")) {
                    startPoint = scope.lpos(start, 0)
                    { scope.lpos(start, it) }
                } {
                    { start }
                }
                endPoint = end
                endProvider = if ((end.type == "canvasElement") || (end.type == "canvasConnection")) {
                    endPoint = scope.lpos(end, 0)
                    { scope.lpos(end, it) }
                } {
                    { end }
                }
                connection = canvasConnection(
                    start = startPoint,
                    contents = list(
                        canvasLineSegment(end = endPoint)
                    ),
                    startMarker = if(args.startMarkerFactory != null) { startMarkerFactory() },
                    endMarker = if(args.endMarkerFactory != null) { endMarkerFactory() },
                    scopes = object(),
                    class = class
                )
                connection.startProvider = startProvider
                connection.endProvider = endProvider
                scope.contents += connection
                connection
            `
        )
    ),
    id(scope).assignField(
        "withRegisterSource",
        fun([
            ...parse("this.callback = it"),
            native((args, context, staticScope, callExpression) => {
                const callback = staticScope.getField("callback", context) as AbstractFunctionObject<any>;
                const result = callback.invoke(args, context);
                result.value.setLocalField("source", {
                    value: result.value,
                    source: callExpression
                });
                return result;
            })
        ])
    ),
    id(scope).assignField(
        "createConnectionOperator",
        fun(
            `
                startMarkerFactory = args.startMarkerFactory
                endMarkerFactory = args.endMarkerFactory
                class = args.class
                scope.withRegisterSource {
                    (start, end) = args
                    _createConnection(
                        start,
                        end,
                        class,
                        startMarkerFactory = startMarkerFactory,
                        endMarkerFactory = endMarkerFactory
                    )
                }
            `,
            {
                docs: `
                    Creates new connection operator function which can be used create new connections.
                    Params:
                        - 0: optional start marker
                        - 1: optional end marker
                    Returns:
                        The generated eonnection operator function
                `
            }
        )
    ),
    ...parse(
        `
            scope.styles {
                class("label-element") {
                    hAlign = "center"
                }
            }
            scopeEnhancer(scope)
            callback.callWithScope(scope)
            diagramCanvas = canvas(contents = scope.contents)
            diagram(diagramCanvas, scope._styles, scope.fonts)
        `
    )
];

/**
 * Module which provides common DSL functionality
 */
export const dslModule = InterpreterModule.create(
    "dsl",
    [],
    [
        DefaultModuleNames.OBJECT,
        DefaultModuleNames.LIST,
        DefaultModuleNames.FUNCTION,
        DefaultModuleNames.BOOLEAN,
        "diagram"
    ],
    [
        assign(
            "generateDiagramEnvironment",
            fun(
                [...parse("scopeEnhancer = it ?? { }"), fun(scopeExpressions)],
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
);
