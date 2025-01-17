import { fun, id, InterpreterModule, numberType, optional, stringType } from "@hylimo/core";
import { createToolboxEdit, SCOPE } from "../../../../base/dslModule.js";

/**
 * Defines an event.<br>
 * An event is an abstract representation of a point on the timeline.
 */
export const eventModule = InterpreterModule.create(
    "uml/sequence/event",
    ["uml/sequence/defaultValues"],
    [],
    [
        id(SCOPE).assignField(
            "event",
            fun(
                `
                    (name, yDistance) = args
                    
                    scope.println("Hello World 1")

                    eventObject = [name = name]
                    if(!(scope.internal.registerInDiagramScope(name, eventObject))) {
                        error("Cannot construct event '\${name}' as this variable is already declared somewhere else")
                    }

                    originalArgs = args

                    // The event itself must store its y-coordinate so that the calculation of the activity indicators and co works correctly
                    previousEvent = scope.internal.lastSequenceDiagramEvent
                    eventObject.deltaY = if(yDistance != null) { yDistance } { scope.eventDistance }
                    eventObject.y = if(previousEvent != null) { previousEvent.y } { 0 } + eventObject.deltaY 

                    scope.println("Hello World 2")

                    // When in debugging mode, print the event name on the left to give an overview where we are
                    if(scope.enableDebugging) {
                        start = scope.apos(-100, eventObject.y) // a little bit to the left of the diagram to leave space for the participants

                        name = canvasElement(content = text(contents = list(span(text = name, fill = "red", stroke = "unset"))), hAlign = "right", vAlign = "center")
                        name.pos = start
                        scope.internal.registerCanvasElement(name, originalArgs, originalArgs.self)

                        maximum = 0
                        scope.internal.sequenceDiagramParticipants.forEach {
                            maximum = Math.max(maximum, it.x)
                        }
                        maximum = maximum - start.x + (scope.participantDistance * 0.25)

                        scope["--"](name, scope.rpos(name, maximum, 0)) scope.styles {
                            stroke = "red"
                        }
                    }
                    scope.println("Hello World 3")

                    // Position the event for each instance relative to the latest previous event
                    // and add all events as per the user facing definition of events, i.e. 'start.User', 'start.Shop', …
                    scope.internal.sequenceDiagramParticipants.forEach {

                        participant = it

                        // When in debugging mode, visualize the coordinates of all events
                        if(scope.enableDebugging) {
                            _left = canvasElement(content = ellipse(fill = "orange", stroke = "unset"), width=7, height=7, hAlign = "center", vAlign = "center")
                            _left.pos = participant.left(eventObject)
                            scope.internal.registerCanvasElement(_left, originalArgs, originalArgs.self)
                            _center = canvasElement(content = ellipse(fill = "orange", stroke = "unset"), width=7, height=7, hAlign = "center", vAlign = "center")
                            _center.pos = scope.apos(participant.x, eventObject.y)
                            scope.internal.registerCanvasElement(_center, originalArgs, originalArgs.self)
                            _right = canvasElement(content = ellipse(fill = "orange", stroke = "unset"), width=7, height=7, hAlign = "center", vAlign = "center")
                            _right.pos = participant.right(eventObject)
                            scope.internal.registerCanvasElement(_right, originalArgs, originalArgs.self)
                        }

                        scope.println("Hello World 4")

                        // change the length of the instance line (its end position) to the new last position + 3*margin
                        // (+3 margin so that a activity indicator that is still present there can end, and there's still a bit of the line left over)
                        endpos = scope.apos(it.x, eventObject.y + (3*scope.margin))
                        it.lifeline.contents.get(it.lifeline.contents.length - 1).end = endpos

                        scope.println("Hello World 5")

                        // Also enlarge all active activity indicators
                        it.activeActivityIndicators.forEach {
                            it.height = it.height + eventObject.deltaY
                        }

                        scope.println("Hello World 6")
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
