import { fun, id, numberType, optional, or } from "@hylimo/core";
import { ContentModule } from "../contentModule.js";
import { SCOPE } from "../../../base/dslModule.js";
import { canvasContentType, elementType } from "../../../base/types.js";
import { CanvasConnection, CanvasElement } from "@hylimo/diagram-common";
import { LinePointLayoutConfig } from "../../../../layout/elements/canvas/linePointLayoutConfig.js";

/**
 * Module providing position DSL functions
 */
export const positionModule = ContentModule.create(
    "base/position",
    [],
    ["base/canvasContent"],
    [
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
                    (targetX, targetY, offsetX, offsetY) = args
                    if (isNumber(targetY)) {
                        point = relativePoint(targetX = targetX, targetY = targetX, offsetX = targetY, offsetY = offsetX)
                        scope.internal.registerCanvasContent(point, args, args.self)
                        point
                    } {
                        point = relativePoint(targetX = targetX, targetY = targetY, offsetX = offsetX, offsetY = offsetY)
                        scope.internal.registerCanvasContent(point, args, args.self)
                        point
                    }
                `,
                {
                    docs: "Create a relative point",
                    params: [
                        [0, "the target to which x-coordinate of the point is relative", canvasContentType],
                        [
                            1,
                            "optional target to which the y-coordinate of the point is relative, if not given, defaults to the same as x",
                            optional(or(canvasContentType, numberType))
                        ],
                        [2, "the x coordinate", optional(numberType)],
                        [3, "the y coordinate", optional(numberType)]
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
        )
    ]
);
