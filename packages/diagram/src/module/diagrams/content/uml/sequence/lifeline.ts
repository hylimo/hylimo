import { anyType, fun, id, InterpreterModule, listType, objectType, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";

const instanceType = objectType(
    new Map([
        ["name", stringType],
        ["line", anyType /* TODO: specify what lines are. CanvasConnections? */],
        ["events", listType(/* TODO: specify element type */)]
    ])
);

/**
 * Defines an event.<br>
 * An event is an abstract representation of a point on the timeline.
 */
export const lifelineModule = InterpreterModule.create(
    "uml/sequence/lifeline",
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
                
                startPosition = event[instance.name]
                if(startPosition == null) {
                    error("'" + event.name + "." + instance.name + "' does not exist which should not happen")
                }
                
                lifelineElement = canvasElement(
                    content = rect(class = list("lifeline"), fill = "white"),
                    class = list("lifeline-element"),
                    width = scope.lifelineWidth,
                    height = 2 * scope.margin // margin around the event, once above and once below
                )
                
                // Explanation of the position:
                // - start: the (x,y) coordinate of the given event-actor combi
                // - x=-0.5*lifelinewidth: In Hylimo coordinates, x is the upper left corner but we want it to be the center of the x-axis instead
                // - y=-margin: The line should not start at the event, but [margin] ahead  
                lifelineElement.pos = scope.rpos(startPosition, -0.5*scope.lifelineWidth, -1*scope.margin)
                
                scope.internal.registerCanvasElement(lifelineElement, args, args.self)
            `,
                {
                    docs: "Activates a lifeline at the most recent event you declared. Lifelines are ranges of time during which an instance is active. You can activate a lifeline multiple times simultaneously",
                    params: [[0, "the instance to activate", instanceType]],
                    snippet: `("$1")`,
                    returns: "The created lifeline"
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
                
                if(instance /* TODO: Fix condition to "no lifeline present" */ == null) {
                    error("Cannot deactivate instance '"+ instance.name + "' as it has not been activated")
                }
            `,
                {
                    docs: "Deactivates the most recent lifeline",
                    params: [[0, "the instance to deactivate", instanceType]],
                    snippet: `("$1")`,
                    returns: "nothing"
                }
            )
        )
    ]
);
