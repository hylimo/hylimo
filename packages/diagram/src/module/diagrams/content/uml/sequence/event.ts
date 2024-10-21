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
                event = scope.apos(0, scope.margin)
                if(scope.internal.lastSequenceDiagramEvent != null) {
                    event = scope.rpos(scope.internal.lastSequenceDiagramEvent, 0, scope.eventDistance)
                }
                
                /*// Add all events as per the user facing definition of events, i.e. 'start.User', 'start.Shop', …
                // TODO: Finish, and store the instance name within actors and instances when possible (not registered already)
                scope.internal.sequenceDiagramElements.forEach {
                    event.set(it.name
                }*/
                
                
                if(!(scope.internal.registerInDiagramScope(name, event))) {
                    error("Cannot construct event '" + name + "' as this variable is already declared somewhere else")
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
