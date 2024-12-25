import { fun, id, InterpreterModule, numberType, optional } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { participantType } from "./types.js";

/**
 * Defines an activity indicator.<br>
 * An activity indicator is the "white" rectangle on top of a activityIndicator.
 * Multiple indicators can be active simultaneously, in which case they are offset from each other by 'activityShift' on the x-axis (or whatever you passed yourself).
 */
export const activityIndicatorModule = InterpreterModule.create(
    "uml/sequence/activityIndicator",
    ["uml/sequence/defaultValues"],
    [],
    [
        id(SCOPE).assignField(
            "activate",
            fun(
                `
                (instance) = args
                if(instance == null) {
                    error("Cannot activate a non-existing instance")
                }
                
                event = scope.internal.lastSequenceDiagramEvent
                if(event == null) {
                    error("activate() can only be called once there is an 'event()'")
                }
                
                if(instance.name == null) {
                    error("Argument of 'activate()' is not an instance or an actor")
                }
                
                startPositionRaw = event[instance.name]
                if(startPositionRaw == null) {
                    if(scope.internal.previouslyExistingSequenceDiagramParticipants[instance.name] != null) {
                      error("'" + instance.name + "' has already been destroyed and thus cannot be activated anymore")
                    } {
                      error("'" + event.name + "." + instance.name + "' does not exist which should not happen")
                    }
                }
                startPosition = startPositionRaw.center
                if(startPosition == null) {
                    error("'" + event.name + "." + instance.name + "' has no 'center' property which should not happen")
                }
                
                activityIndicators = instance.activeActivityIndicators
                defaultLineshift = scope.activityShift
                xshift = args.xshift
                
                // xshift is relative to the most recent activity indicator, not to the root one
                xshift = if(xshift == null) {
                    if(activityIndicators.length == 0) {
                        0
                    } {
                        activityIndicators.get(activityIndicators.length - 1).xshift + defaultLineshift
                    }
                } {
                    if(activityIndicators.length == 0) {
                      error("'xshift' can only be set when another activity indicator is already active")
                    }
                    activityIndicators.get(activityIndicators.length - 1).xshift + xshift
                }
                
                // By default, start the indicator 'margin' above on the y-axis as it looks visually nicer not to have an arrow directly pointing at the corner of the indicator
                // However, to be UML compliant, it must also be possible to start it at a corner
                // Additionally, since it should be ABOVE the event, we must negate the argument
                yStart = args.yoffset
                yStart = -1 * if (yStart != null) { yStart } { scope.margin }
                height = scope.margin - yStart // make the pillar a bit more aesthetically pleasing by adding a bit of margin on both sides - at least if the user wants it (yStart is supposed to be negative, so add it on top of the height)
                
                width = scope.activityWidth
                
                activityIndicatorElement = canvasElement(
                    content = rect(class = list("activity-indicator")),
                    class = list("activity-indicator-element"),
                    width = width,
                    height = height
                )
                
                activityIndicatorElement.xshift = xshift
                activityIndicatorElement.leftX = xshift - (0.5 * width)
                activityIndicatorElement.rightX = activityIndicatorElement.leftX + width

                // Explanation of the position:
                // - start: the (x,y) coordinate of the given event-actor combi
                // - x=-0.5*activity indicatorwidth + xshift: In Hylimo coordinates, x is the upper left corner but we want it to be the center of the x-axis instead (unless there are multiple activity indicators simultaneously, then we want to offset them)
                // - y=-margin: The line should not start at the event, but [margin] ahead  
                activityIndicatorElement.pos = scope.rpos(startPosition, -0.5*scope.activityWidth + xshift, yStart)
                
                scope.internal.registerCanvasElement(activityIndicatorElement, args, args.self)
                instance.activeActivityIndicators += activityIndicatorElement
                
                scope.styles {
                  cls("activity-indicator") {
                    fill = var("background")
                  }
                }
                
                activityIndicatorElement
            `,
                {
                    docs: "Activates an activity indicator at the most recent event you declared. activity indicators are ranges of time during which an instance is active. You can activate an activity indicator multiple times simultaneously for the same participant",
                    params: [
                        [0, "the participant (instance or actor) to activate", participantType],
                        [
                            "xshift",
                            "an optional shift on the x-axis when using multiple activity indicators simultaneously on the same instance. Defaults to 'activityShift'",
                            optional(numberType)
                        ],
                        [
                            "yoffset",
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
                (instance) = args
                if(instance == null) {
                    error("Cannot deactivate a non-existing instance")
                }
                
                if(instance.activeActivityIndicators.length == 0) {
                    error("Cannot deactivate instance '"+ instance.name + "' as it has not been activated")
                }
                activityIndicator = instance.activeActivityIndicators.remove()
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
