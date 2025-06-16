import { DefaultEditTypes } from "@hylimo/diagram-common";
import { ContentModule } from "../contentModule.js";
import {
    assertString,
    fun,
    functionType,
    id,
    jsFun,
    listType,
    literal,
    optional,
    or,
    str,
    stringType
} from "@hylimo/core";
import { PREDICTION_STYLE_CLASS_ASSIGNMENT_EXPRESSION, SCOPE } from "../../../base/dslModule.js";
import { canvasContentType } from "../../../base/types.js";
import { jsonataStringLiteral } from "../../../base/editModule.js";

/**
 * Enum for the connection toolbox edits.
 */
export enum ConnectionToolboxEdit {
    /**
     * Change the connection to a line path
     */
    CHANGE_TO_LINE = "toolbox/Type/Change to line path",
    /**
     * Change the connection to an axis aligned path
     */
    CHANGE_TO_AXIS_ALIGNED = "toolbox/Type/Change to axis aligned path",
    /**
     * Change the connection to a bezier path
     */
    CHANGE_TO_BEZIER = "toolbox/Type/Change to bezier path",
    /**
     * Add a label to the connection
     */
    ADD_LABEL = "toolbox/Label/Add label"
}

/**
 * Generates the fragments used for the create connection edit
 * - startExpression: jsonata expression used with the connection operator
 * - posExpression: jsonata expression used within the start / end DSL functions
 *
 * @param variable the variable to generate the fragments for
 * @returns the jsonata fragment expressions
 */
export function connectionEditFragments(variable: "start" | "end"): {
    startExpression: string;
    posExpression: string;
} {
    return {
        startExpression: `(${variable}.expression ? ${variable}.expression : ('apos(' & ${variable}.x & ', ' & ${variable}.y &')'))`,
        posExpression: `(${variable}.expression ? ${variable}.pos : '')`
    };
}

/**
 * Module providing canvas connection DSL constructs
 */
export const canvasConnectionModule = ContentModule.create(
    "base/canvasConnection",
    [],
    ["base/canvasContent", "base/position"],
    [
        id(SCOPE)
            .field("internal")
            .assignField(
                "createConnection",
                fun(
                    `
                        (start, end, class, target, canvasScope) = args
                        startMarkerFactory = args.startMarkerFactory
                        endMarkerFactory = args.endMarkerFactory
                        lineType = args.lineType ?? scope.internal.config.defaultLineType
                        startPoint = start
                        startProvider = if((start.type == "canvasElement") || (start.type == "canvasConnection")) {
                            startPoint = canvasScope.lpos(start, 0)
                            startPoint.edits[
                                "${DefaultEditTypes.MOVE_LPOS_POS}"
                            ] = createAppendScopeEdit(
                                target,
                                "with",
                                if(lineType == "axisAligned") { "'over = start(' & pos & ').axisAligned(0.5, end(0.5))'" } { "'over = start(' & pos & ').line(end(0.5))'" }
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
                            endPoint = canvasScope.lpos(end, 0.5)
                            endPoint.edits[
                                "${DefaultEditTypes.MOVE_LPOS_POS}"
                            ] = createAppendScopeEdit(
                                target,
                                "with",
                                if(lineType == "axisAligned") { "'over = start(0).axisAligned(0.5, end(' & pos & '))'" } { "'over = start(0).line(end(' & pos & '))'" }
                            )
                            {
                                endPoint.pos = it
                                endPoint
                            }
                        } {
                            { end }
                        }
                        this.connection = canvasConnection(
                            start = startPoint,
                            contents = list(),
                            startMarker = if(args.startMarkerFactory != null) { startMarkerFactory() },
                            endMarker = if(args.endMarkerFactory != null) { endMarkerFactory() },
                            class = class
                        )
                        if(lineType == "axisAligned") {
                            this.segment = canvasAxisAlignedSegment(end = endPoint, verticalPos = 0.5)
                            segment.edits[
                                "${DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS}"
                            ] = createAppendScopeEdit(target, "with", "'over = start(0).axisAligned(' & pos & ', end(0.5))'")
                            segment.edits[
                                "${DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT}"
                            ] = createAppendScopeEdit(target, "with", "'over = start(0).axisAligned(' & pos & ', apos(' & x & ', ' & y & '), ' & nextPos & ', end(0.5))'")
                            connection.contents.add(segment)
                            connection.edits["${ConnectionToolboxEdit.CHANGE_TO_LINE}"] = createAppendScopeEdit(
                                target,
                                "with",
                                "'over = start(0).line(end(0.5))'"
                            )
                        } {
                            this.segment = canvasLineSegment(end = endPoint)
                            segment.edits["${DefaultEditTypes.SPLIT_CANVAS_LINE_SEGMENT}"] = createAppendScopeEdit(target, "with", "'over = start(0).line(apos(' & x & ', ' & y & '), end(0.5))'")
                            connection.contents.add(segment)
                            connection.edits["${ConnectionToolboxEdit.CHANGE_TO_AXIS_ALIGNED}"] = createAppendScopeEdit(
                                target,
                                "with",
                                "'over = start(0).axisAligned(0.5, end(0.5))'"
                            )
                        }
                        connection.edits["${ConnectionToolboxEdit.ADD_LABEL}"] = createAppendScopeEdit(
                            target,
                            "with",
                            "'label(\\"example\\")'"
                        )
                        connection.edits["${ConnectionToolboxEdit.CHANGE_TO_BEZIER}"] = createAppendScopeEdit(
                            target,
                            "with",
                            "'over = start(0).bezier(50, 50, end(0.5), -50, -50)'"
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
                "createConnectionEdit",
                jsFun(
                    (args, context) => {
                        const operator = assertString(args.getFieldValue(0, context));
                        const createLine = args.getFieldValue("lineType", context).toNative() == "line";
                        const escapedOperator = jsonataStringLiteral(` ${operator} `);
                        const start = connectionEditFragments("start");
                        const end = connectionEditFragments("end");
                        const segment = createLine ? "line(" : "axisAligned(0.5, ";
                        const edit = `'\n' & ${start.startExpression} & ${escapedOperator} & ${end.startExpression} & ' with {\n    over = start(' & ${start.posExpression} & ').${segment}end(' & ${end.posExpression} & '))\n}' & ${PREDICTION_STYLE_CLASS_ASSIGNMENT_EXPRESSION}`;
                        context
                            .getField(SCOPE)
                            .getFieldValue("internal", context)
                            .getFieldValue("canvasAddEdits", context)
                            .setLocalField(
                                `connection/${operator}`,
                                { value: context.newString(edit), source: undefined },
                                context
                            );
                        return context.null;
                    },
                    {
                        docs: "Creates a connection edit for the given operator",
                        params: [
                            [0, "the operator to create the edit for", stringType],
                            [
                                "lineType",
                                'Determines what sort of segment should be created. Defaults to "axisAligned". Optional, one of "axisAligned" (line that either moves on the x-axis, or the y-axis, but not both simultaneously), "line" (straight line).',
                                optional(or(literal("axisAligned"), literal("line")))
                            ]
                        ],
                        returns: "null"
                    }
                )
            ),
        id(SCOPE)
            .field("internal")
            .assignField(
                "createConnectionOperator",
                fun(
                    [
                        `
                        startMarkerFactory = args.startMarkerFactory
                        endMarkerFactory = args.endMarkerFactory
                        class = args.class
                        (operator) = args
                        if(operator != null) {
                            scope.internal.createConnectionEdit(operator)
                        }
                    `,
                        fun(
                            `
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
                        `,
                            {
                                docs: "Creates a new connection between two canvas elements/connections/points",
                                params: [
                                    [0, "the start element", canvasContentType],
                                    [1, "the end element", canvasContentType]
                                ],
                                returns: "The created connection"
                            }
                        )
                    ],
                    {
                        docs: "Creates new connection operator function which can be used create new connections.",
                        params: [
                            [
                                0,
                                "the operator to use for the create connection edit, if omitted no edit is created",
                                optional(stringType)
                            ],
                            ["startMarkerFactory", "optional start marker factory", optional(functionType)],
                            ["endMarkerFactory", "optional end marker factory", optional(functionType)],
                            ["class", "the class of the connection", optional(listType(stringType))]
                        ],
                        returns: "The generated connection operator function"
                    }
                )
            )
    ],
    [
        [
            "defaultLineType",
            "The default line type used for connections, when the path is not manually set. Note: there are some exceptions where this is not used.",
            or(literal("axisAligned"), literal("line")),
            str("axisAligned")
        ]
    ]
);
