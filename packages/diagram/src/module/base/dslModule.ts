import {
    assign,
    enumObject,
    ExecutableExpression,
    fun,
    functionType,
    id,
    InterpreterModule,
    numberType,
    optional,
    parse
} from "@hylimo/core";
import { canvasContentType, elementType } from "./types.js";
import { CanvasConnection, CanvasElement, DefaultEditTypes } from "@hylimo/diagram-common";
import { LinePointLayoutConfig } from "../../layout/elements/canvas/linePointLayoutConfig.js";

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
                scope.internal.registerCanvasContent(point, args)
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
                scope.internal.registerCanvasContent(point, args)
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
                scope.internal.registerCanvasContent(point, args)
                point
            `,
            {
                docs: "Create a line point",
                params: [
                    [0, "the line provider", elementType(CanvasElement.TYPE, CanvasConnection.TYPE)],
                    [
                        1,
                        "the relative position on the line, number between 0 and 1, or a tuple of the segment and the relative position on the segment",
                        LinePointLayoutConfig.POS_TYPE
                    ],
                    [2, "the distance from the line", optional(numberType)]
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
                positions = it
                target = args
                segments = args.self.segments
                positions.forEach {
                    (point, index) = args
                    segment = canvasLineSegment(end = point)
                    segment.edits.set(
                        "${DefaultEditTypes.SPLIT_CANVAS_LINE_SEGMENT}",
                        createAddArgEdit(target, index - 0.5, "'apos(' & x & ', ' & y & ')'")
                    )
                    segments += segment
                }
                args.self
            }
            lineBuilderProto.axisAligned = listWrapper {
                positions = it
                target = args
                segments = args.self.segments
                range(positions.length / 2).forEach {
                    segment = canvasAxisAlignedSegment(
                        end = positions.get(2 * it + 1),
                        verticalPos = positions.get(2 * it)
                    )
                    segment.edits.set(
                        "${DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT}",
                        createAddArgEdit(target, 2 * it - 0.5, "pos & ', apos(' & x & ', ' & y & ')'")
                    )
                    segments += this.segment
                }
                args.self
            }
            lineBuilderProto.bezier = listWrapper {
                positions = it
                target = args
                self = args.self
                segments = self.segments
                segmentCount = (positions.length - 2) / 3
                startPoint = if(segments.length > 0) {
                    segments.get(segments.length - 1).end
                } {
                    self.start
                }

                range(segmentCount - 1).forEach {
                    endPoint = positions.get(3 * it + 2)
                    segment = canvasBezierSegment(
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
                    segment.edits.set(
                        "${DefaultEditTypes.SPLIT_CANVAS_BEZIER_SEGMENT}",
                        createAddArgEdit(target, 3 * it + 1.5, "'apos(' & x & ', ' & y & '), ' & cx1 & ', ' & cy1")
                    )
                    segments += segment
                    startPoint = endPoint
                }

                endPoint = positions.get(3 * segmentCount - 1)
                segment = canvasBezierSegment(
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
                segment.edits.set(
                    "${DefaultEditTypes.SPLIT_CANVAS_BEZIER_SEGMENT}",
                    createAddArgEdit(target, 3 * segmentCount - 1.5, "'apos(' & x & ', ' & y & '), ' & cx1 & ', ' & cy1")
                )
                segments += segment
                args.self
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
                } {
                    this.moveEdit = createAddEdit(callback, "'pos = apos(' & dx & ', ' & dy & ')'")
                    self.edits.set("${DefaultEditTypes.MOVE_X}", this.moveEdit)
                    self.edits.set("${DefaultEditTypes.MOVE_Y}", this.moveEdit)
                }
                if(result.width != null) {
                    self.width = result.width
                } {
                    self.edits.set("${DefaultEditTypes.RESIZE_WIDTH}", createAddEdit(callback, "'width = ' & width"))
                }
                if(result.height != null) {
                    self.height = result.height
                } {
                    self.edits.set("${DefaultEditTypes.RESIZE_HEIGHT}", createAddEdit(callback, "'height = ' & height"))
                }
                if(result.rotation != null) {
                    self.rotation = result.rotation
                } {
                    self.edits.set("${DefaultEditTypes.ROTATE}", createAddEdit(callback, "'rotation = ' & rotation"))
                }
                self
            `,
            {
                docs: "Layout operator which can be applied either to a CanvasElement",
                params: [
                    [0, "the CanvasElement or CanvasConnection to aply the layout to", elementType(CanvasElement.TYPE)],
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
                        pos = self.startProvider(it)
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
                        scope.internal.registerCanvasElement(labelCanvasElement, args)
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
                } {
                    if (self.contents.length == 1) {
                        segment = self.contents.get(0)
                        self.start.edits.set(
                            "${DefaultEditTypes.MOVE_LPOS_POS}",
                            createAddEdit(callback, "'over = start(' & pos & ').axisAligned(0.5, end(0.5))'")
                        )
                        segment.end.edits.set(
                            "${DefaultEditTypes.MOVE_LPOS_POS}",
                            createAddEdit(callback, "'over = start(0).axisAligned(0.5, end(' & pos & '))'")
                        )
                        segment.edits.set(
                            "${DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS}",
                            createAddEdit(callback, "'over = start(0).axisAligned(' & pos & ', end(0.5))'")
                        )
                        segment.edits.set(
                            "${DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT}",
                            createAddEdit(callback, "'over = start(0).axisAligned(' & pos & ', apos(' & x & ', ' & y & '), ' & nextPos & ', end(0.5))'")
                        )
                    }
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
                (start, end, class, target) = args
                startMarkerFactory = args.startMarkerFactory
                endMarkerFactory = args.endMarkerFactory
                startPoint = start
                startProvider = if((start.type == "canvasElement") || (start.type == "canvasConnection")) {
                    startPoint = scope.lpos(start, 0)
                    startPoint.edits.set(
                        "${DefaultEditTypes.MOVE_LPOS_POS}",
                        createAppendScopeEdit(target, "with", "'over = start(' & pos & ').axisAligned(0.5, end(0.5))'")
                    )
                    { 
                        startPoint.pos = it
                        startPoint
                    }
                } {
                    { start }
                }
                endPoint = end
                endProvider = if ((end.type == "canvasElement") || (end.type == "canvasConnection")) {
                    endPoint = scope.lpos(end, 0.5)
                    endPoint.edits.set(
                        "${DefaultEditTypes.MOVE_LPOS_POS}",
                        createAppendScopeEdit(target, "with", "'over = start(0).axisAligned(0.5, end(' & pos & '))'")
                    )
                    {
                        endPoint.pos = it
                        endPoint
                    }
                } {
                    { end }
                }
                
                this.segment = canvasAxisAlignedSegment(end = endPoint, verticalPos = 0.5)
                segment.edits.set(
                    "${DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS}",
                    createAppendScopeEdit(target, "with", "'over = start(0).axisAligned(' & pos & ', end(0.5))'")
                )
                segment.edits.set(
                    "${DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT}",
                    createAppendScopeEdit(target, "with", "'over = start(0).axisAligned(' & pos & ', apos(' & x & ', ' & y & '), ' & nextPos & ', end(0.5))'")
                )

                connection = canvasConnection(
                    start = startPoint,
                    contents = list(
                        this.segment
                    ),
                    startMarker = if(args.startMarkerFactory != null) { startMarkerFactory() },
                    endMarker = if(args.endMarkerFactory != null) { endMarkerFactory() },
                    scopes = object(),
                    class = class
                )
                connection.startProvider = startProvider
                connection.endProvider = endProvider
                scope.internal.registerCanvasElement(connection, target)

                connection
            `,
            {
                docs: "Helper which creates a CanvasConnection between two elements",
                params: [
                    [0, "the start element", canvasContentType],
                    [1, "the end element", canvasContentType]
                ],
                returns: "The created CanvasConnection"
            }
        )
    ),
    id(scope)
        .field("internal")
        .assignField(
            "registerCanvasContent",
            fun(
                `
                    (content, source) = args
                    scope.contents += content
                    content.source = reflect(source)
                    content
                `
            )
        ),
    id(scope)
        .field("internal")
        .assignField(
            "registerCanvasElement",
            fun(
                `
                    (element, source) = args
                    scope.internal.registerCanvasContent(element, source)

                    this.moveEdit = createAppendScopeEdit(source, "layout", "'pos = apos(' & dx & ', ' & dy & ')'")
                    element.edits.set("${DefaultEditTypes.MOVE_X}", this.moveEdit)
                    element.edits.set("${DefaultEditTypes.MOVE_Y}", this.moveEdit)
                    element.edits.set("${DefaultEditTypes.ROTATE}", createAppendScopeEdit(source, "layout", "'rotation = ' & rotation"))
                    this.resizeEdit = createAppendScopeEdit(
                        source,
                        "layout",
                        "( $w := $exists(width) ? 'width = ' & width : []; $h := $exists(height) ? 'height = ' & height : []; $join($append($w, $h), '\\n') )"
                    )
                    element.edits.set("${DefaultEditTypes.RESIZE_WIDTH}", this.resizeEdit)
                    element.edits.set("${DefaultEditTypes.RESIZE_HEIGHT}", this.resizeEdit)

                    element
                `
            )
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

                {
                    (start, end) = args
                    _createConnection(
                        start,
                        end,
                        class,
                        args,
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
            scope.element = {
                callbackOrElement = it
                this.element = if(callbackOrElement._type == "element") {
                    canvasElement(content = callbackOrElement, scopes = object())
                } {
                    canvasElement(content = callbackOrElement(), scopes = object())
                }
                scope.internal.registerCanvasElement(this.element, args)
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
        )
    ]
);
