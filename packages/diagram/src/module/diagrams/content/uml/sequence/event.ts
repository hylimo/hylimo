import { fun, id, InterpreterModule, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";

/**
 * Defines an event.<br>
 * An event is an abstract representation of a point on the timeline.
 */
export const eventModule = InterpreterModule.create(
    "uml/sequence/event",
    [],
    [],
    [
        id(SCOPE).assignField(
            "event",
            fun(
                `
                (name) = args
                
                eventObject = []
                
                if(!(scope.internal.registerInDiagramScope(name, eventObject))) {
                    error("Cannot construct event '" + name + "' as this variable is already declared somewhere else")
                }
                
                // Position the event for each instance relative to the latest previous event
                // and add all events as per the user facing definition of events, i.e. 'start.User', 'start.Shop', …
                scope.internal.sequenceDiagramElements.forEach {
                
                    // Use either the position below the instance, or the position below the last event
                    eventPosition = scope.rpos(it.pos, 0, scope.eventDistance)
                    events = it.events
                    if(events.length > 0) {
                        eventPosition = scope.rpos(events.get(events.length - 1), 0, scope.eventDistance)
                    }
                    
                    it.events += eventPosition // for the position calculation
                    eventObject[it.name] = eventPosition // for arrows, i.e. 'event.shop --> event.cart'
                }
                
                scope.internal.lastSequenceDiagramEvent = event
                `,
                {
                    docs: "Creates an event. Events are points in time when something happens, without knowing where.",
                    params: [[0, "the name of the event. Can be used as variable afterward", stringType]],
                    snippet: `("$1")`,
                    returns: "The created event"
                }
            )
        )
    ]
);
