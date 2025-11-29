import { fun, functionType, id, numberType, optional } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { participantType } from "./types.js";
import { ContentModule } from "../../contentModule.js";
import { DefaultEditTypes } from "@hylimo/diagram-common";

/**
 * Defines an activity indicator.<br>
 * An activity indicator is the "white" rectangle on top of a lifeline.
 * Multiple indicators can be active simultaneously, in which case they are offset from each other by 'activityShift' on the x-axis (or whatever you passed yourself).
 */
export const activityIndicatorModule = ContentModule.create(
    "uml/sequence/activityIndicator",
    ["uml/sequence/defaultValues", "uml/sequence/diagramState"],
    [],
    [
        id(SCOPE).assignField(
            "activate",
            fun(
                `
                    (participant, callback) = args
                    this.originalArgs = args

                    this.at = args.at
                    this.after = args.after
                    
                    this.position = scope.internal.calculatePosition(at = at, after = after, priority = 1)
                    scope.internal.updateSequenceDiagramPosition(position)
                    scope.internal.registerTargetPosition(scope.internal.config.strokeMargin, 1)

                    if(participant.alive != true) {
                        error("participant has already been destroyed and thus cannot be activated anymore")
                    }

                    this.lastLeftRight = if(participant.leftRightPositions.length > 0) {
                        participant.leftRightPositions.get(participant.leftRightPositions.length - 1)
                    } {
                        [left = 0, right = 0, position = 0]
                    }
                    
                    if(position < lastLeftRight.position) {
                        error("Cannot activate participant before the last recorded position")
                    }

                    this.activityIndicators = participant.activeActivityIndicators
                    this.defaultLineshift = scope.internal.config.activityShift
                    this.xShift = args.xShift

                    xShift = if(xShift == null) {
                        if(activityIndicators.length == 0) {
                            0
                        } {
                            activityIndicators.get(activityIndicators.length - 1).xShift + defaultLineshift
                        }
                    } {
                        if(activityIndicators.length == 0) {
                            error("'xShift' can only be set when another activity indicator is already active")
                        }
                        activityIndicators.get(activityIndicators.length - 1).xShift + xShift
                    }

                    this.width = scope.internal.config.activityWidth

                    activityIndicatorElement = canvasElement(
                        contents = list(rect(class = list("activity-indicator"))),
                        class = list("activity-indicator-element"),
                        width = width,
                        height = scope.internal.config.minActivityHeight,
                        class = list("activity-indicator-element")
                    )

                    activityIndicatorElement.xShift = xShift
                    activityIndicatorElement.leftX = xShift - (0.5 * width)
                    activityIndicatorElement.rightX = activityIndicatorElement.leftX + width
                    activityIndicatorElement.startY = position

                    scope.internal.registerFrameInclusion(participant, Math.max(0, -(activityIndicatorElement.leftX)), Math.max(0, activityIndicatorElement.rightX))

                    activityIndicatorElement.pos = scope.rpos(participant.referencePos, xShift, position)
                    activityIndicatorElement.pos.edits["${DefaultEditTypes.MOVE_Y}"] = createAdditiveEdit(at ?? after, "dy")

                    scope.internal.registerCanvasElement(activityIndicatorElement, args, args.self)
                    participant.activeActivityIndicators += activityIndicatorElement
                    
                    participant.leftRightPositions += [
                        position = position,
                        left = Math.min(lastLeftRight.left, activityIndicatorElement.leftX),
                        right = Math.max(lastLeftRight.right, activityIndicatorElement.rightX)
                    ]

                    if(callback != null) {
                        callback()
                        scope.deactivate(participant)
                    }

                    activityIndicatorElement
                `,
                {
                    docs: "Activates an activity indicator at a calculated position. Activity indicators are ranges of time during which a participant is active. You can activate an activity indicator multiple times simultaneously for the same participant. If a callback is provided, it will be executed and the indicator will be automatically deactivated afterwards.",
                    params: [
                        [0, "the participant (instance or actor) to activate", participantType],
                        [
                            1,
                            "optional callback function to execute within this activation. After execution, deactivate is called automatically",
                            optional(functionType)
                        ],
                        [
                            "at",
                            "the absolute y position where to activate. If set, takes priority over 'after'",
                            optional(numberType)
                        ],
                        [
                            "after",
                            "the relative y offset from the current position. Only used if 'at' is not set",
                            optional(numberType)
                        ],
                        [
                            "xShift",
                            "an optional shift on the x-axis when using multiple activity indicators simultaneously on the same participant. Defaults to 'activityShift'",
                            optional(numberType)
                        ]
                    ],
                    snippet: `($1) {\n    $2\n}`,
                    returns: "The created activity indicator"
                }
            )
        ),
        id(SCOPE).assignField(
            "deactivate",
            fun(
                `
                    (participant) = args

                    if(participant.activeActivityIndicators.length == 0) {
                        error("Cannot deactivate participant as it has not been activated")
                    }

                    this.at = args.at
                    this.after = args.after

                    this.activityIndicator = participant.activeActivityIndicators.remove()
                    
                    this.calculatedHeight = scope.internal.calculatePosition(at = at, after = after, priority = 2) - activityIndicator.startY
                    this.position = activityIndicator.startY + Math.max(calculatedHeight, scope.internal.config.minActivityHeight)
                    scope.internal.updateSequenceDiagramPosition(position)
                    scope.internal.registerTargetPosition(scope.internal.config.deactivateMargin, 2)

                    activityIndicator.height = position - activityIndicator.startY
                    activityIndicator.edits["${DefaultEditTypes.RESIZE_HEIGHT}"] = createAdditiveEdit(at ?? after, "dh")
                    
                    if(participant.activeActivityIndicators.length > 0) {
                        lastActive = participant.activeActivityIndicators.get(participant.activeActivityIndicators.length - 1)
                        participant.leftRightPositions += [position = position, left = lastActive.leftX, right = lastActive.rightX]
                    } {
                        participant.leftRightPositions += [position = position, left = 0, right = 0]
                    }
                `,
                {
                    docs: "Deactivates the most recent activity indicator at a calculated position",
                    params: [
                        [0, "the participant to deactivate", participantType],
                        [
                            "at",
                            "the absolute y position where to deactivate. If set, takes priority over 'after'",
                            optional(numberType)
                        ],
                        [
                            "after",
                            "the relative y offset from the current position. Only used if 'at' is not set",
                            optional(numberType)
                        ]
                    ],
                    snippet: `($1)`,
                    returns: "nothing"
                }
            )
        ),
        `
            scope.styles {
                cls("activity-indicator") {
                    fill = var("background")
                }
                cls("activity-indicator-element") {
                    hAlign = "center"
                }
            }
        `
    ]
);
