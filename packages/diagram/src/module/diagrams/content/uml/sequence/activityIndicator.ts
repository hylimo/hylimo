import { fun, id, numberType, optional } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { participantType } from "./types.js";
import { ContentModule } from "../../contentModule.js";

/**
 * Defines an activity indicator.<br>
 * An activity indicator is the "white" rectangle on top of a activityIndicator.
 * Multiple indicators can be active simultaneously, in which case they are offset from each other by 'activityShift' on the x-axis (or whatever you passed yourself).
 */
export const activityIndicatorModule = ContentModule.create(
    "uml/sequence/activityIndicator",
    ["uml/sequence/defaultValues"],
    [],
    [
        id(SCOPE).assignField(
            "activate",
            fun(
                `
                    originalArgs = args
                    (participant) = args
                    if(participant == null) {
                        error("Cannot activate a non-existing participant")
                    }

                    event = scope.internal.lastSequenceDiagramEvent
                    if(event == null) {
                        error("activate() can only be called once there is an 'event()'")
                    }

                    if(participant.alive != true) {
                        error("'\${participant.name}' has already been destroyed and thus cannot be activated anymore")
                    }

                    activityIndicators = participant.activeActivityIndicators
                    defaultLineshift = scope.internal.config.activityShift
                    xShift = args.xShift

                    // xShift is relative to the most recent activity indicator, not to the root one
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

                    // By default, start the indicator 'margin' above on the y-axis as it looks visually nicer not to have an arrow directly pointing at the corner of the indicator
                    // However, to be UML compliant, it must also be possible to start it at a corner
                    // Additionally, since it should be ABOVE the event, we must negate the argument
                    yStart = args.yOffset
                    yStart = -1 * if (yStart != null) { yStart } { scope.internal.config.margin }
                    height = scope.internal.config.margin - yStart // make the pillar a bit more aesthetically pleasing by adding a bit of margin on both sides - at least if the user wants it (yStart is supposed to be negative, so add it on top of the height)

                    width = scope.internal.config.activityWidth

                    activityIndicatorElement = canvasElement(
                        content = rect(class = list("activity-indicator")),
                        class = list("activity-indicator-element"),
                        width = width,
                        height = height
                    )

                    activityIndicatorElement.xShift = xShift
                    activityIndicatorElement.leftX = xShift - (0.5 * width)
                    activityIndicatorElement.rightX = activityIndicatorElement.leftX + width

                    // Explanation of the position:
                    // - start: the (x,y) coordinate of the given event-actor combi
                    // - x=-0.5*activity indicatorwidth + xShift: In Hylimo coordinates, x is the upper left corner but we want it to be the center of the x-axis instead (unless there are multiple activity indicators simultaneously, then we want to offset them)
                    // - y=-margin: The line should not start at the event, but [margin] ahead  
                    activityIndicatorElement.pos = scope.apos(participant.x - (0.5 * scope.internal.config.activityWidth) + xShift, event.y + yStart)

                    scope.internal.registerCanvasElement(activityIndicatorElement, args, args.self)
                    participant.activeActivityIndicators += activityIndicatorElement
                    if(participant.events[event.name] == null) {
                        scope.error("participant '\${participant.name}' does not seem to have data for event '\${event.name}' which shouldn't happen")
                    }
                    participant.events[event.name].activityIndicators += activityIndicatorElement

                    // When in debugging mode, visualize the coordinates of the new activity indicator here - they cannot be captured by 'event(...)' as this indicator didn't exist back then: 'event(...);activate(...)'
                    // Also works with multiple indicators as then the right point will simply be hidden behind the new indicator
                    if(scope.internal.config.enableDebugging) {
                        // We must offset the points by half their width as the indicator has been centered
                        _left = canvasElement(content = ellipse(fill = "orange", stroke = "unset"), width=7, height=7, hAlign = "center", vAlign = "center")
                        _left.pos = participant.left()
                        scope.internal.registerCanvasElement(_left, originalArgs, originalArgs.self)
                        // No 'center' as this doesn't make sense when we have multiple indicators
                        _right = canvasElement(content = ellipse(fill = "orange", stroke = "unset"), width=7, height=7, hAlign = "center", vAlign = "center")
                        _right.pos = participant.right()
                        scope.internal.registerCanvasElement(_right, originalArgs, originalArgs.self)
                    }

                    scope.styles {
                        cls("activity-indicator") {
                            fill = var("background")
                        }
                    }

                    activityIndicatorElement
                `,
                {
                    docs: "Activates an activity indicator at the most recent event you declared. activity indicators are ranges of time during which a participant is active. You can activate an activity indicator multiple times simultaneously for the same participant",
                    params: [
                        [0, "the participant (instance or actor) to activate", participantType],
                        [
                            "xShift",
                            "an optional shift on the x-axis when using multiple activity indicators simultaneously on the same participant. Defaults to 'activityShift'",
                            optional(numberType)
                        ],
                        [
                            "yOffset",
                            "an optional offset on the y-axis where to start being active. Defaults to 'margin'",
                            optional(numberType)
                        ]
                    ],
                    snippet: `($1)`,
                    returns: "The created activity indicator"
                }
            )
        ),
        id(SCOPE).assignField(
            "deactivate",
            fun(
                `
                    (participant) = args
                    if(participant == null) {
                        error("Cannot deactivate a non-existing participant")
                    }

                    if(participant.activeActivityIndicators.length == 0) {
                        error("Cannot deactivate participant '\${participant.name}' as it has not been activated")
                    }

                    eventName = scope.internal.lastSequenceDiagramEvent.name
                    if(participant.events[eventName] == null) {
                        scope.error("participant '\${participant.name}' does not seem to have data for event '\${eventName}' which shouldn't happen")
                    }
                    participant.events[eventName].activityIndicators.remove()
                    activityIndicator = participant.activeActivityIndicators.remove()
                `,
                {
                    docs: "Deactivates the most recent activity indicator",
                    params: [[0, "the participant to deactivate", participantType]],
                    snippet: `($1)`,
                    returns: "nothing"
                }
            )
        )
    ]
);
