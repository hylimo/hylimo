import {
    assign,
    enumObject,
    ExecutableExpression,
    fun,
    functionType,
    id,
    InterpreterModule,
    jsFun,
    listType,
    literal,
    namedType,
    numberType,
    objectType,
    optional,
    or,
    ParseableExpressions,
    str,
    validateObject
} from "@hylimo/core";
import { canvasContentType, canvasPointType, elementType } from "./types.js";
import {
    CanvasAxisAlignedSegment,
    CanvasBezierSegment,
    CanvasConnection,
    CanvasElement,
    CanvasLineSegment,
    DefaultEditTypes
} from "@hylimo/diagram-common";
import { LinePointLayoutConfig } from "../../layout/elements/canvas/linePointLayoutConfig.js";
import { DiagramModuleNames } from "../diagramModuleNames.js";
import { allStyleAttributes } from "./diagramModule.js";
import dedent from "dedent";
import { LayoutEngine } from "../../layout/engine/layoutEngine.js";

/**
 * Identifier for the scope variable
 */
export const SCOPE = "scope";

/**
 * Types for all layout scope properties
 */
const layoutScopeProperties = [
    {
        name: "width",
        type: optional(numberType)
    },
    {
        name: "height",
        type: optional(numberType)
    },
    {
        name: "pos",
        type: optional(canvasPointType)
    },
    {
        name: "rotation",
        type: optional(numberType)
    }
];

/**
 * Types for the canvas connection with scope properties
 */
const canvasConnectionWithScopeProperties = [
    {
        name: "over",
        type: optional(
            namedType(
                objectType(
                    new Map([
                        [
                            "segments",
                            listType(
                                elementType(
                                    CanvasBezierSegment.TYPE,
                                    CanvasLineSegment.TYPE,
                                    CanvasAxisAlignedSegment.TYPE
                                )
                            )
                        ]
                    ])
                ),
                "LineSegmentList"
            )
        )
    }
];

/**
 * Creates a toolbox edit which is registered in `scope.internal.toolboxEdits`
 *
 * @param edit the name of the edit, prefixed with `toolbox/`
 * @param createElementCode the code which creates the element, expected to return a CanvasElement
 * @returns the executable expression which creates the toolbox edit
 */
export function createToolboxEdit(edit: string, createElementCode: string): ExecutableExpression {
    return id(SCOPE)
        .field("internal")
        .field("toolboxEdits")
        .assignField(
            `toolbox/${edit}`,
            str(
                `'\n${dedent(createElementCode)} layout {\n    pos = apos(' & x & ', ' & y & ')\n}' & (prediction ? ' styles { class += "${LayoutEngine.PREDICTION_CLASS}" }' : '')`
            )
        );
}

/**
 * Expressions which create the initial scope which is passed to the callback of all diagram DSL functions
 */
const scopeExpressions: ParseableExpressions = [
    `
        callback = it
        scope = [
            fonts = list(defaultFonts.roboto, defaultFonts.openSans, defaultFonts.sourceCodePro),
            contents = list(),
            internal = [
                classCounter = 0,
                styles = [styles = list()],
                toolboxEdits = []
            ]
        ]
    `,
    id(SCOPE).assignField(
        "apos",
        fun(
            `
                (x, y) = args
                point = absolutePoint(x = x, y = y)
                scope.internal.registerCanvasContent(point, args, args.self)
                point
            `,
            {
                docs: "Create a absolute point",
                params: [
                    [0, "the x coordinate", optional(numberType)],
                    [1, "the y coordinate", optional(numberType)]
                ],
                returns: "The created absolute point"
            }
        )
    ),
    id(SCOPE).assignField(
        "rpos",
        fun(
            `
                (target, offsetX, offsetY) = args
                point = relativePoint(target = target, offsetX = offsetX, offsetY = offsetY)
                scope.internal.registerCanvasContent(point, args, args.self)
                point
            `,
            {
                docs: "Create a relative point",
                params: [
                    [0, "the target to which the point is relative", canvasContentType],
                    [1, "the x coordinate", optional(numberType)],
                    [2, "the y coordinate", optional(numberType)]
                ],
                returns: "The created relative point"
            }
        )
    ),
    id(SCOPE).assignField(
        "lpos",
        fun(
            `
                (lineProvider, pos, distance) = args
                point = linePoint(lineProvider = lineProvider, pos = pos, distance = distance)
                scope.internal.registerCanvasContent(point, args, args.self)
                point
            `,
            {
                docs: "Create a line point",
                params: [
                    [0, "the line provider", elementType(CanvasElement.TYPE, CanvasConnection.TYPE)],
                    [
                        1,
                        "the relative position on the line, number between 0 and 1, or a tuple of the segment and the relative position on the segment",
                        optional(LinePointLayoutConfig.POS_TYPE)
                    ],
                    [2, "the distance from the line", optional(numberType)]
                ],
                returns: "The created line point"
            }
        )
    ),
    id(SCOPE).assignField(
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
                    resultingStyle = styles(
                        second,
                        [
                            selectorType = "class",
                            selectorValue = className,
                            styles = list(),
                            class = first.class,
                            variables = [],
                            ${allStyleAttributes.map((attr) => `${attr.name} = null`).join(",")}
                        ],
                        true
                    )
                    scope.internal.styles.styles.add(resultingStyle)
                    first
                } {
                    resultStyles = styles(first, [styles = list()])
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
    assign(
        "_validateCanvasConnectionWithScope",
        jsFun((args, context) => {
            const value = args.getFieldValue(0, context);
            validateObject(value, context, canvasConnectionWithScopeProperties);
            return context.null;
        })
    ),
    `
        lineBuilderProto = []
        lineBuilderProto.line = listWrapper {
            positions = it
            target = args
            segments = args.self.segments
            positions.forEach {
                (point, index) = args
                segment = canvasLineSegment(end = point)
                segment.edits[
                    "${DefaultEditTypes.SPLIT_CANVAS_LINE_SEGMENT}"
                ] = createAddArgEdit(target, index - 0.5, "'apos(' & x & ', ' & y & ')'")
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
                segment.edits[
                    "${DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT}"
                ] = createAddArgEdit(target, 2 * it - 0.5, "pos & ', apos(' & x & ', ' & y & ')'")
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
                segment.edits[
                    "${DefaultEditTypes.SPLIT_CANVAS_BEZIER_SEGMENT}"
                ] = createAddArgEdit(target, 3 * it + 1.5, "'apos(' & x & ', ' & y & '), ' & cx1 & ', ' & cy1")
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
            segment.edits[
                "${DefaultEditTypes.SPLIT_CANVAS_BEZIER_SEGMENT}"
            ] = createAddArgEdit(target, 3 * segmentCount - 1.5, "'apos(' & x & ', ' & y & '), ' & cx1 & ', ' & cy1")
            segments += segment
            args.self
        }
        
        _canvasConnectionWith = {
            (self, callback) = args
            this.contents = self.canvasScope.contents
            result = [
                over = null,
                end = self.endProvider,
                start = {
                    pos = self.startProvider(it)
                    [proto = lineBuilderProto, segments = list(), start = pos]
                },
                label = {
                    (labelContent, pos, distance, rotation) = args
                    if("".proto == labelContent.proto) {
                        labelContent = list(span(text = labelContent))
                    }
                    labelCanvasElement = canvasElement(
                        content = text(contents = labelContent, class = list("label")),
                        pos = self.canvasScope.lpos(self, pos, distance),
                        class = list("label-element")
                    )
                    scope.internal.registerCanvasElement(labelCanvasElement, args, self.canvasScope)
                    labelCanvasElement.rotation = rotation
                    labelCanvasElement
                }
            ]
            callback.callWithScope(result)
            _validateCanvasConnectionWithScope(result, args)
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
                    self.start.edits[
                        "${DefaultEditTypes.MOVE_LPOS_POS}"
                    ] = createAddEdit(callback, "'over = start(' & pos & ').axisAligned(0.5, end(0.5))'")
                    segment.end.edits[
                        "${DefaultEditTypes.MOVE_LPOS_POS}"
                    ] = createAddEdit(callback, "'over = start(0).axisAligned(0.5, end(' & pos & '))'")
                    segment.edits[
                        "${DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS}"
                    ] = createAddEdit(callback, "'over = start(0).axisAligned(' & pos & ', end(0.5))'")
                    segment.edits[
                        "${DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT}"
                    ] = createAddEdit(callback, "'over = start(0).axisAligned(' & pos & ', apos(' & x & ', ' & y & '), ' & nextPos & ', end(0.5))'")
                }
            }
        }

        _canvasPointOrElementWith = {
            (self, callback) = args
            this.contents = self.canvasScope.contents
            result = [
                label = {
                    (labelContent, x, y, rotation) = args
                    if("".proto == labelContent.proto) {
                        labelContent = list(span(text = labelContent))
                    }
                    labelCanvasElement = canvasElement(
                        content = text(contents = labelContent, class = list("label")),
                        pos = self.canvasScope.rpos(self, x, y),
                        class = list("label-element")
                    )
                    scope.internal.registerCanvasElement(labelCanvasElement, args, self.canvasScope)
                    labelCanvasElement.rotation = rotation
                    labelCanvasElement
                }
            ]
            callback.callWithScope(result)
        }
    `,
    assign(
        "_validateLayoutScope",
        jsFun((args, context) => {
            const value = args.getFieldValue(0, context);
            validateObject(value, context, layoutScopeProperties);
            return context.null;
        })
    ),
    id(SCOPE).assignField(
        "layout",
        fun(
            `
                (self, callback) = args
                result = [pos = null, width = null, height = null, rotation = null]
                callback.callWithScope(result)
                _validateLayoutScope(result, args)
                if(result.pos != null) {
                    self.pos = result.pos
                } {
                    this.moveEdit = createAddEdit(callback, "'pos = apos(' & dx & ', ' & dy & ')'")
                    self.edits["${DefaultEditTypes.MOVE_X}"] = this.moveEdit
                    self.edits["${DefaultEditTypes.MOVE_Y}"] = this.moveEdit
                }
                if(result.width != null) {
                    self.width = result.width
                } {
                    self.edits["${DefaultEditTypes.RESIZE_WIDTH}"] = createAddEdit(callback, "'width = ' & width")
                }
                if(result.height != null) {
                    self.height = result.height
                } {
                    self.edits["${DefaultEditTypes.RESIZE_HEIGHT}"] = createAddEdit(callback, "'height = ' & height")
                }
                if(result.rotation != null) {
                    self.rotation = result.rotation
                } {
                    self.edits["${DefaultEditTypes.ROTATE}"] = createAddEdit(callback, "'rotation = ' & rotation")
                }
                self
            `,
            {
                docs: "Layout operator which can be applied to a CanvasElement",
                params: [
                    [
                        0,
                        "the CanvasElement or CanvasConnection to apply the layout to",
                        elementType(CanvasElement.TYPE)
                    ],
                    [1, "callback which provides the layout definition", functionType]
                ],
                returns: "The provided element"
            }
        )
    ),
    id(SCOPE).assignField(
        "with",
        fun(
            `
                (self, callback) = args
                if(self.type == "canvasConnection") {
                    _canvasConnectionWith(self, callback)
                } {
                    _canvasPointOrElementWith(self, callback)
                }
                self
            `,
            {
                docs: `
                    With operator which can be applied to a CanvasConnection, CanvasElement or CanvasPoint.
                    Applied to a CanvasConnection, it allows to define a new route using the over field, and to add labels using the label function.
                    Applied to a CanvasElement or CanvasPoint, it allows to add labels using the label function.
                `,
                params: [
                    [0, "the CanvasContent to which to apply the with", canvasContentType],
                    [1, "the callback providing the new route via the field over and/or labels", functionType]
                ],
                returns: "null",
                snippet: ` {\n    over = start($1).line(end($2))\n}`
            }
        )
    ),
    id(SCOPE)
        .field("internal")
        .assignField(
            "createConnection",
            fun(
                `
                (start, end, class, target, canvasScope) = args
                startMarkerFactory = args.startMarkerFactory
                endMarkerFactory = args.endMarkerFactory
                lineType = args.lineType ?? "axisAligned"
                startPoint = start
                startProvider = if((start.type == "canvasElement") || (start.type == "canvasConnection")) {
                    startPoint = canvasScope.lpos(start, 0)
                    startPoint.edits[
                        "${DefaultEditTypes.MOVE_LPOS_POS}"
                    ] = createAppendScopeEdit(target, "with", "'over = start(' & pos & ').axisAligned(0.5, end(0.5))'")
                    { 
                        startPoint.pos = it
                        startPoint
                    }
                } {
                    { start }
                }
                endPoint = end
                endProvider = if ((end.type == "canvasElement") || (end.type == "canvasConnection")) {
                    endPoint = canvasScope.lpos(end, 0.5)
                    endPoint.edits[
                        "${DefaultEditTypes.MOVE_LPOS_POS}"
                    ] = createAppendScopeEdit(target, "with", "'over = start(0).axisAligned(0.5, end(' & pos & '))'")
                    {
                        endPoint.pos = it
                        endPoint
                    }
                } {
                    { end }
                }
                this.segment = null
                if(lineType == "axisAligned") {
                    segment = canvasAxisAlignedSegment(end = endPoint, verticalPos = 0.5)
                    segment.edits[
                        "${DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS}"
                    ] = createAppendScopeEdit(target, "with", "'over = start(0).axisAligned(' & pos & ', end(0.5))'")
                    segment.edits[
                        "${DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT}"
                    ] = createAppendScopeEdit(target, "with", "'over = start(0).axisAligned(' & pos & ', apos(' & x & ', ' & y & '), ' & nextPos & ', end(0.5))'")
                } {
                    segment = canvasLineSegment(end = endPoint)
                    segment.edits["${DefaultEditTypes.SPLIT_CANVAS_LINE_SEGMENT}"] = createAppendScopeEdit(target, "with", "'over = start(0).line(apos(' & x & ', ' & y & '), end(0.5))'")
                }
                connection = canvasConnection(
                    start = startPoint,
                    contents = list(
                        this.segment
                    ),
                    startMarker = if(args.startMarkerFactory != null) { startMarkerFactory() },
                    endMarker = if(args.endMarkerFactory != null) { endMarkerFactory() },
                    class = class
                )
                connection.startProvider = startProvider
                connection.endProvider = endProvider
                scope.internal.registerCanvasElement(connection, target, canvasScope)

                connection
            `,
                {
                    docs: "Helper which creates a CanvasConnection between two elements",
                    params: [
                        [0, "the start element", canvasContentType],
                        [1, "the end element", canvasContentType],
                        [2, "the class of the connection"],
                        [3, "the target expression referenced by edits"],
                        [4, "the scope to which canvas contents should be added"],
                        [
                            "startMarkerFactory",
                            "What to print at the start of the arrow, most commonly one of the 'scope.defaultMarkers' values"
                        ],
                        [
                            "endMarkerFactory",
                            "What to print at the end of the arrow, most commonly one of the 'scope.defaultMarkers' values"
                        ],
                        [
                            "lineType",
                            'Determines what sort of segment should be created. Defaults to "axisAligned". Optional, one of "axisAligned" (line that either moves on the x-axis, or the y-axis, but not both simultaneously), "line" (straight line).',
                            optional(or(literal("axisAligned"), literal("line")))
                        ]
                    ],
                    returns: "The created CanvasConnection"
                }
            )
        ),
    id(SCOPE)
        .field("internal")
        .assignField(
            "registerCanvasContent",
            fun(
                `
                    (content, source, canvasScope) = args
                    canvasScope.contents += content
                    content.canvasScope = canvasScope
                    content.source = reflect(source)
                    content
                `
            )
        ),
    id(SCOPE)
        .field("internal")
        .assignField(
            "registerCanvasElement",
            fun(
                `
                    (element, source, canvasScope) = args
                    scope.internal.registerCanvasContent(element, source, canvasScope)

                    this.moveEdit = createAppendScopeEdit(source, "layout", "'pos = apos(' & dx & ', ' & dy & ')'")
                    element.edits["${DefaultEditTypes.MOVE_X}"] = this.moveEdit
                    element.edits["${DefaultEditTypes.MOVE_Y}"] = this.moveEdit
                    element.edits["${DefaultEditTypes.ROTATE}"] = createAppendScopeEdit(source, "layout", "'rotation = ' & rotation")
                    this.resizeEdit = createAppendScopeEdit(
                        source,
                        "layout",
                        "( $w := $exists(width) ? 'width = ' & width : []; $h := $exists(height) ? 'height = ' & height : []; $join($append($w, $h), '\\n') )"
                    )
                    element.edits["${DefaultEditTypes.RESIZE_WIDTH}"] = this.resizeEdit
                    element.edits["${DefaultEditTypes.RESIZE_HEIGHT}"] = this.resizeEdit

                    element
                `
            )
        ),
    id(SCOPE)
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
                    scope.internal.createConnection(
                        start,
                        end,
                        class,
                        args,
                        args.self,
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
    id(SCOPE)
        .field("internal")
        .assignField(
            "registerInDiagramScope",
            fun(
                `
                    (name, value) = args
                    isNew = scope[name] == null
                    if(isNew) {
                        scope[name] = value
                    }
                    isNew // Return true if the name has actually been added
                `
            )
        ),
    id(SCOPE).assignField(
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
    id(SCOPE).assignField(
        "VAlign",
        enumObject({
            Top: "top",
            Center: "center",
            Bottom: "bottom"
        })
    ),
    id(SCOPE).assignField(
        "HAlign",
        enumObject({
            Left: "left",
            Center: "center",
            Right: "right"
        })
    ),
    id(SCOPE).assignField(
        "Visibility",
        enumObject({
            Visible: "visible",
            Hidden: "hidden",
            Collapse: "collapse"
        })
    ),
    `
        scopeEnhancer(scope)
        callback.callWithScope(scope)
        canvasEdits = []
        scope.internal.toolboxEdits.forEach {
            (value, key) = args
            if(key != "proto") {
                canvasEdits[key] = createAddEdit(callback, value)
            } 
        }
        diagramCanvas = canvas(contents = scope.contents, edits = canvasEdits)
        createDiagram(diagramCanvas, scope.internal.styles, scope.fonts)
    `
];

/**
 * Module which provides common DSL functionality
 */
export const dslModule = InterpreterModule.create(
    DiagramModuleNames.DSL,
    [],
    [DiagramModuleNames.DIAGRAM],
    [
        assign(
            "generateDiagramEnvironment",
            fun(["scopeEnhancer = it ?? { }", fun(scopeExpressions)], {
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
