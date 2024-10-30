import { fun, id, InterpreterModule, numberType, optional, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";

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
                
                eventObject = [name = name]
                
                if(!(scope.internal.registerInDiagramScope(name, eventObject))) {
                    error("Cannot construct event '" + name + "' as this variable is already declared somewhere else")
                }
                
                // The event itself must store its y-coordinate so that the calculation of the lifelines and co works correctly
                previousEvent = scope.internal.sequenceDiagramEvent
                eventObject.deltaY = if(yDistance != null) { yDistance } { scope.eventDistance }
                eventObject.y = if(previousEvent != null) { previousEvent.y } { 0 } + eventObject.deltaY 
                
                // Position the event for each instance relative to the latest previous event
                // and add all events as per the user facing definition of events, i.e. 'start.User', 'start.Shop', …
                scope.internal.sequenceDiagramElements.forEach {
                
                    // Use either the position below the instance, the position below the last event, or the user supplied position
                    eventPosition = scope.rpos(it.pos, 0, eventObject.deltaY)
                    events = it.events
                    if(events.length > 0) {
                        eventPosition = scope.rpos(events.get(events.length - 1), 0, eventObject.deltaY)
                    }
                    
                    it.events += eventPosition // for the position calculation
                    
                    // When we have a lifeline, we have to relocate the arrow to the end of the most recent lifeline, either on the left or on the right side of the lifeline
                    leftX = 0
                    rightX = 0
                    activeLifelines = it.activeLifelines
                    if(activeLifelines.length > 0) {
                       lastLifeline = activeLifelines.get(activeLifelines.length - 1)
                       leftX = lastLifeline.leftX
                       rightX = lastLifeline.rightX
                    }
                    // TODO - Remove: scope.println("Event " +  eventObject.name + "." + it.name + ": left X: " + leftX + ", right X: " + rightX)
                    eventObject[it.name] = [ left = scope.rpos(eventPosition, leftX, 0), center = eventPosition, right = scope.rpos(eventPosition, rightX, 0)] // for arrows, i.e. 'event.shop --> event.cart', the left/right is unwrapped by the arrow itself
                    
                    // change the length of the instance line (its end position) to the new last position + 3*margin
                    // (+3 margin so that a lifeline that is still present there can end, and there's still a bit of the line left over)
                    endpos = scope.rpos(eventPosition, 0, 3*scope.margin)
                    it.line.contents.get(it.line.contents.length - 1).end = endpos
                    
                    // Also enlarge all active lifelines
                    it.activeLifelines.forEach {
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
        )
    ]
);
