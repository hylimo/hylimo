import {
    assign,
    enumObject,
    ExecutableExpression,
    ExecutableNativeFunctionExpression,
    fun,
    FunctionObject,
    functionType,
    id,
    InterpreterModule,
    jsFun,
    NativeFunctionType,
    numberType,
    optional,
    or,
    parse
} from "@hylimo/core";
import { canvasPointType, elementType } from "./types";
import { CanvasConnection, CanvasElement } from "@hylimo/diagram-common";

/**
 * Identifier for the scope variable
 */
const scope = "scope";

/**
 * Expressions which create the initial scope which is passed to the callback of all diagram DSL functions
 */
const scopeExpressions: ExecutableExpression[] = [
    ...parse(
        `
            callback = it
            scope = object(
                fonts = list(defaultFonts.roboto, defaultFonts.openSans, defaultFonts.sourceCodePro),
                contents = list(),
                internal = object(
                    classCounter = 0,
                    styles = styles({ })
                ),
                protos = object()
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
                docs: "Create a absolute point",
                params: [
                    [0, "the x coordinate", numberType],
                    [1, "the y coordinate", numberType]
                ],
                returns: "The created absolute point"
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
                docs: "Create a relative point",
                params: [
                    [0, "the target to which the point is relative", elementType()],
                    [1, "the x coordinate", numberType],
                    [2, "the y coordinate", numberType]
                ],
                returns: "The created relative point"
            }
        )
    ),
    id(scope).assignField(
        "lpos",
        fun(
            `
                (lineProvider, pos, distance) = args
                point = linePoint(lineProvider = lineProvider, pos = pos, distance = distance, segment = args.seg)
                scope.contents += point
                point
            `,
            {
                docs: "Create a line point",
                params: [
                    [0, "the line provider", elementType(CanvasElement.TYPE, CanvasConnection.TYPE)],
                    [1, "the relative position on the line, number between 0 and 1", numberType],
                    [2, "the distance from the line", optional(numberType)],
                    [
                        "seg",
                        "the segment to which the position is relative to, if not provided, the whole line is considered, should be an integer",
                        optional(numberType)
                    ]
                ],
                returns: "The created line point"
            }
        )
    ),
    id(scope).assignField(
        "styles",
        fun(
            `
                (first, second) = args
                if(second != null) {
                    className = "canvas-content-" + scope.internal.classCounter
                    scope.internal.classCounter = scope.internal.classCounter + 1
                    if (first.class == null) {
                        first.class = list(className)
                    } {
                        first.class += className
                    }
                    first.scopes.styles = second
                    scope.styles {
                        cls(className) {
                            this.any = any
                            this.cls = cls
                            this.type = type
                            this.unset = unset
                            this.var = var
                            this.vars = vars
                            this.class = first.class
                            second.callWithScope(this)
                        }
                    }
                    first
                } {
                    resultStyles = styles(first)
                    scope.internal.styles.styles.addAll(resultStyles.styles)
                }
            `,
            {
                docs: "Style function which can either be used globally with one parameter or applied as operator to some (graphical) element",
                params: [
                    [0, "either the element or the callback which contains the style definition"],
                    [1, "if an element was provided for 0, the callback"]
                ],
                returns: "The provided object if or null if none was provided"
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
    id(scope).assignField(
        "layout",
        fun(
            `
                (self, callback) = args
                self.scopes.layout = callback
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
                self
            `,
            {
                docs: "Layout operator which can be applied either to a CanvasElement",
                params: [
                    [
                        0,
                        "the CanvasElement or CanvasConnection to ally the layout to",
                        elementType(CanvasElement.TYPE, CanvasConnection.TYPE)
                    ],
                    [1, "callback which provides the layout definition", functionType]
                ],
                returns: "The provided element"
            }
        )
    ),
    id(scope).assignField(
        "with",
        fun(
            `
                (self, callback) = args
                self.scopes.with = callback
                result = object(
                    over = null,
                    end = self.endProvider,
                    start = {
                        pos = self.startProvider(args)
                        object(proto = lineBuilderProto, segments = list(), start = pos)
                    },
                    label = {
                        (labelContent, pos, distance, rotation) = args
                        if(object().==(self = "".proto, labelContent.proto)) {
                            labelContent = list(span(text = labelContent))
                        }
                        labelCanvasElement = canvasElement(
                            content = text(contents = labelContent, class = list("label")),
                            pos = scope.lpos(self, pos ?? 0, distance, seg = args.seg),
                            rotation = rotation,
                            scopes = object(),
                            class = list("label-element")
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
                self
            `,
            {
                docs: "Helper which applies a with operator to a CanvasElement. Handles the routing points, and labels.",
                params: [
                    [0, "the CanvasElement to which to apply the with", elementType(CanvasConnection.TYPE)],
                    [1, "the callback providing the new route via the field over", functionType]
                ],
                returns: "null",
                snippet: ` {\n    over = start($1).line(end($2))\n}`
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
                    { scope.lpos(start, it.get(0), seg = it.seg) }
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
            `,
            {
                docs: "Helper which creates a CanvasConnection between two elements",
                params: [
                    [0, "the start element", or(canvasPointType, elementType(CanvasElement.TYPE))],
                    [1, "the end element", or(canvasPointType, elementType(CanvasElement.TYPE))]
                ],
                returns: "The created CanvasConnection"
            }
        )
    ),
    id(scope)
        .field("internal")
        .assignField(
            "withRegisterSource",
            jsFun((args, context) => {
                const callback = args.getField(0, context) as FunctionObject;
                const wrapperFunctionCallback: NativeFunctionType = (args, context, staticScope, callExpression) => {
                    const result = callback.invoke(args, context);
                    result.value.setLocalField("source", {
                        value: result.value,
                        source: callExpression
                    });
                    return result;
                };
                return new ExecutableNativeFunctionExpression(
                    wrapperFunctionCallback,
                    callback.definition.documentation
                ).evaluate(context);
            })
        ),
    id(scope)
        .field("internal")
        .assignField(
            "createConnectionOperator",
            fun(
                `
                startMarkerFactory = args.startMarkerFactory
                endMarkerFactory = args.endMarkerFactory
                class = args.class
                scope.internal.withRegisterSource {
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
                    docs: "Creates new connection operator function which can be used create new connections.",
                    params: [
                        [0, "optional start marker factory", optional(functionType)],
                        [1, "optional end marker factory", optional(functionType)]
                    ],
                    returns: "The generated connection operator function"
                }
            )
        ),
    id(scope).assignField(
        "Position",
        enumObject({
            Right: 0,
            BottomRight: 0.125,
            Bottom: 0.25,
            BottomLeft: 0.375,
            Left: 0.5,
            TopLeft: 0.625,
            Top: 0.75,
            TopRight: 0.875
        })
    ),
    id(scope).assignField(
        "VAlign",
        enumObject({
            Top: "top",
            Center: "center",
            Bottom: "bottom"
        })
    ),
    id(scope).assignField(
        "HAlign",
        enumObject({
            Left: "left",
            Center: "center",
            Right: "right"
        })
    ),
    ...parse(
        `
            scope.element = scope.internal.withRegisterSource {
                callbackOrElement = it
                this.element = if(callbackOrElement._type == "element") {
                    canvasElement(content = callbackOrElement, scopes = object())
                } {
                    canvasElement(scopes = object(), callbackOrElement)
                }
                scope.contents += this.element
                this.element
            }
            scope.styles {
                cls("label-element") {
                    hAlign = "center"
                }
            }
            scopeEnhancer(scope)
            callback.callWithScope(scope)
            diagramCanvas = canvas(contents = scope.contents)
            createDiagram(diagramCanvas, scope.internal.styles, scope.fonts)
        `
    )
];

/**
 * Module which provides common DSL functionality
 */
export const dslModule = InterpreterModule.create(
    "dsl",
    [],
    ["diagram"],
    [
        assign(
            "generateDiagramEnvironment",
            fun([...parse("scopeEnhancer = it ?? { }"), fun(scopeExpressions)], {
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
                    `,
                params: [
                    [
                        0,
                        "the scope enhancer, a function which takes the scope and can modify it, optional",
                        optional(functionType)
                    ]
                ],
                returns: "The diagram DSL function"
            })
        ),
        assign("diagram", id("generateDiagramEnvironment").call())
    ]
);
