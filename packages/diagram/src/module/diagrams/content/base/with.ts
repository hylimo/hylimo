import {
    assign,
    fun,
    functionType,
    id,
    jsFun,
    listType,
    namedType,
    objectType,
    optional,
    validateObject
} from "@hylimo/core";
import { ContentModule } from "../contentModule.js";
import { canvasContentType, elementType } from "../../../base/types.js";
import {
    CanvasAxisAlignedSegment,
    CanvasBezierSegment,
    CanvasLineSegment,
    DefaultEditTypes
} from "@hylimo/diagram-common";
import { ConnectionToolboxEdit } from "./canvasConnection.js";
import { SCOPE } from "../../../base/dslModule.js";

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
 * Module providing the with operator
 */
export const withModule = ContentModule.create(
    "base/with",
    [],
    ["base/canvasContent", "base/canvasConnection", "base/position"],
    [
        assign(
            "_validateCanvasConnectionWithScope",
            jsFun((args, context) => {
                const value = args.getFieldValue(0, context);
                validateObject(value, context, canvasConnectionWithScopeProperties);
                return context.null;
            })
        ),
        `
            this._lineBuilderProto = []
            _lineBuilderProto.line = listWrapper {
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
            _lineBuilderProto.axisAligned = listWrapper {
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
            _lineBuilderProto.bezier = listWrapper {
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
                    endControlPoint = scope.rpos(
                        endPoint,
                        -(positions.get(3 * it + 3)),
                        -(positions.get(3 * it + 4))
                    )
                    endControlPoint.edits["${DefaultEditTypes.MOVE_X}"] = createAdditiveEdit(positions.get(3 * it + 3), "(- dx)")
                    endControlPoint.edits["${DefaultEditTypes.MOVE_Y}"] = createAdditiveEdit(positions.get(3 * it + 4), "(- dy)")
                    segment = canvasBezierSegment(
                        startControlPoint = scope.rpos(
                            startPoint,
                            positions.get(3 * it),
                            positions.get(3 * it + 1)
                        ),
                        endControlPoint = endControlPoint,
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

            this._canvasConnectionWith = {
                (self, callback) = args
                this.contents = self.canvasScope.contents
                this.lastStartValue = 0
                this.lastEndValue = 0.5
                result = [
                    over = null,
                    end = {
                        lastEndValue = it ?? ""
                        self.endProvider(it)
                    },
                    start = {
                        pos = self.startProvider(it)
                        lastStartValue = it ?? ""
                        [proto = _lineBuilderProto, segments = list(), start = pos]
                    },
                    label = {
                        (labelContent, pos, distance, rotation) = args
                        if(isString(labelContent)) {
                            labelContent = list(span(text = labelContent))
                        }
                        labelCanvasElement = canvasElement(
                            contents = list(text(contents = labelContent, class = list("label"))),
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
                    self.edits["${ConnectionToolboxEdit.CHANGE_TO_LINE}"] = createReplaceEdit(
                        result.over,
                        "'start(\${lastStartValue}).line(end(\${lastEndValue}))'"
                    )
                    self.edits["${ConnectionToolboxEdit.CHANGE_TO_AXIS_ALIGNED}"] = createReplaceEdit(
                        result.over,
                        "'start(\${lastStartValue}).axisAligned(0.5, end(\${lastEndValue}))'"
                    )
                    self.edits["${ConnectionToolboxEdit.CHANGE_TO_BEZIER}"] = createReplaceEdit(
                        result.over,
                        "'start(\${lastStartValue}).bezier(50, 50, end(\${lastEndValue}), -50, -50)'"
                    )
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
                    self.edits["${ConnectionToolboxEdit.CHANGE_TO_LINE}"] = createAddEdit(
                        callback,
                        "'over = start(0).line(end(0.5))'"
                    )
                    self.edits["${ConnectionToolboxEdit.CHANGE_TO_AXIS_ALIGNED}"] = createAddEdit(
                        callback,
                        "'over = start(0).axisAligned(0.5, end(0.5))'"
                    )
                    self.edits["${ConnectionToolboxEdit.CHANGE_TO_BEZIER}"] = createAddEdit(
                        callback,
                        "'over = start(0).bezier(50, 50, end(0.5), -50, -50)'"
                    )
                }
                self.edits["${ConnectionToolboxEdit.ADD_LABEL}"] = createAddEdit(
                    callback,
                    "'label(\\"example\\")'"
                )
            }
    
            this._canvasPointOrElementWith = {
                (self, callback) = args
                this.contents = self.canvasScope.contents
                result = [
                    label = {
                        (labelContent, x, y, rotation) = args
                        if(isString(labelContent)) {
                            labelContent = list(span(text = labelContent))
                        }
                        labelCanvasElement = canvasElement(
                            contents = list(text(contents = labelContent, class = list("label"))),
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
        )
    ]
);
