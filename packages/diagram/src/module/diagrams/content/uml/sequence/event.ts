import { fun, id, numberType, optional, stringType } from "@hylimo/core";
import { createToolboxEdit, SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";

/**
 * Defines an event.<br>
 * An event is an abstract representation of a point on the timeline.
 */
export const eventModule = ContentModule.create(
    "uml/sequence/event",
    ["uml/sequence/defaultValues"],
    [],
    [
        id(SCOPE).assignField(
            "event",
            fun(
                `
                    (name, yDistance) = args

                    eventObject = [name = name]
                    if(!(scope.internal.registerInDiagramScope(name, eventObject))) {
                        error("Cannot construct event '\${name}' as this variable is already declared somewhere else")
                    }

                    originalArgs = args

                    // The event itself must store its y-coordinate so that the calculation of the activity indicators and co works correctly
                    previousEvent = scope.internal.lastSequenceDiagramEvent
                    eventObject.deltaY = if(yDistance != null) { yDistance } { scope.internal.config.eventDistance }
                    eventObject.y = if(previousEvent != null) { previousEvent.y } { 0 } + eventObject.deltaY 

                    // When in debugging mode, print the event name on the left to give an overview where we are
                    if(scope.internal.config.enableDebugging) {
                        start = scope.apos(-100, eventObject.y) // a little bit to the left of the diagram to leave space for the participants

                        name = canvasElement(contents = list(text(contents = list(span(text = name, fill = "red", stroke = "unset")))), hAlign = "right", vAlign = "center")
                        name.pos = start
                        scope.internal.registerCanvasElement(name, originalArgs, originalArgs.self)

                        maximum = 0
                        scope.internal.sequenceDiagramParticipants.forEach {
                            maximum = Math.max(maximum, it.x)
                        }
                        maximum = maximum - start.x + (scope.internal.config.participantDistance * 0.25)

                        scope["--"](name, scope.rpos(name, maximum, 0)) scope.styles {
                            stroke = "red"
                        }
                    }

                    // Position the event for each instance relative to the latest previous event
                    // and add all events as per the user facing definition of events, i.e. 'start.User', 'start.Shop', …
                    scope.internal.sequenceDiagramParticipants.forEach {

                        participant = it

                        // When in debugging mode, visualize the coordinates of all events
                        if(scope.internal.config.enableDebugging) {
                            _left = canvasElement(contents = list(ellipse(fill = "orange", stroke = "unset")), width=7, height=7, hAlign = "center", vAlign = "center")
                            _left.pos = participant.left(eventObject)
                            scope.internal.registerCanvasElement(_left, originalArgs, originalArgs.self)
                            _center = canvasElement(contents = list(ellipse(fill = "orange", stroke = "unset")), width=7, height=7, hAlign = "center", vAlign = "center")
                            _center.pos = scope.apos(participant.x, eventObject.y)
                            scope.internal.registerCanvasElement(_center, originalArgs, originalArgs.self)
                            _right = canvasElement(contents = list(ellipse(fill = "orange", stroke = "unset")), width=7, height=7, hAlign = "center", vAlign = "center")
                            _right.pos = participant.right(eventObject)
                            scope.internal.registerCanvasElement(_right, originalArgs, originalArgs.self)
                        }

                        // Precreate the data necessary to store what activity indicators are active for the participant at this event
                        participant.events[eventObject.name] = if(scope.internal.lastSequenceDiagramEvent == null) {
                            [ activityIndicators = list()]
                        } {
                            previousData = participant.events[scope.internal.lastSequenceDiagramEvent.name]
                            if(previousData != null) {
                                [ activityIndicators = previousData.activityIndicators.map({ it }) /* we need to copy the list, not the contents, as the list may be updated later on */ ]
                            } {
                                [ activityIndicators = list()]
                            }
                        }

                        // change the length of the instance line (its end position) to the new last position + 3*margin
                        // (+3 margin so that a activity indicator that is still present there can end, and there's still a bit of the line left over)
                        endpos = scope.apos(it.x, eventObject.y + (3*scope.internal.config.margin))
                        it.lifeline.contents.get(it.lifeline.contents.length - 1).end = endpos

                        // Also enlarge all active activity indicators
                        it.activeActivityIndicators.forEach {
                            it.height = it.height + eventObject.deltaY
                        }
                    }
                    scope.internal.lastSequenceDiagramEvent = eventObject
                `,
                {
                    docs: "Creates an event. Events are points in time when something happens, without knowing where.",
                    params: [
                        [0, "the name of the event. Can be used as variable afterward", stringType],
                        [
                            1,
                            "an optional distance on the y-axis to the previous event. Defaults to 'eventDistance'",
                            optional(numberType)
                        ]
                    ],
                    snippet: `("$1")`,
                    returns: "The created event"
                }
            )
        ),
        createToolboxEdit("event/Event", 'event("Example")', false)
    ]
);
