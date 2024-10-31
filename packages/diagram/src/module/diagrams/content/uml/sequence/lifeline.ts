import { fun, id, InterpreterModule, numberType, optional } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { instanceType } from "./types.js";

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
                
                startPositionRaw = event[instance.name]
                if(startPositionRaw == null) {
                    error("'" + event.name + "." + instance.name + "' does not exist which should not happen")
                }
                startPosition = startPositionRaw.center
                if(startPosition == null) {
                    error("'" + event.name + "." + instance.name + "' has no 'center' property which should not happen")
                }
                
                lifelines = instance.activeLifelines
                defaultLineshift = scope.lifelineShift
                xshift = args.xshift
                
                // xshift is relative to the most recent lifeline, not to the root one
                xshift = if(xshift == null) {
                    if(lifelines.length == 0) {
                        0
                    } {
                        lifelines.get(lifelines.length - 1).xshift + defaultLineshift
                    }
                } {
                    if(lifelines.length == 0) {
                      error("'xshift' can only be set when another lifeline is already active")
                    }
                    lifelines.get(lifelines.length - 1).xshift + xshift
                }
                
                width = scope.lifelineWidth
                
                lifelineElement = canvasElement(
                    content = rect(class = list("lifeline"), fill = "white"),
                    class = list("lifeline-element"),
                    width = width,
                    height = 2 * scope.margin // margin around the event, once above and once below
                )
                
                lifelineElement.xshift = xshift
                lifelineElement.leftX = xshift - (0.5 * width)
                lifelineElement.rightX = lifelineElement.leftX + width
                
                // Explanation of the position:
                // - start: the (x,y) coordinate of the given event-actor combi
                // - x=-0.5*lifelinewidth + xshift: In Hylimo coordinates, x is the upper left corner but we want it to be the center of the x-axis instead (unless there are multiple lifelines simultaneously, then we want to offset them)
                // - y=-margin: The line should not start at the event, but [margin] ahead  
                lifelineElement.pos = scope.rpos(startPosition, -0.5*scope.lifelineWidth + xshift, -1*scope.margin)
                
                scope.internal.registerCanvasElement(lifelineElement, args, args.self)
                instance.activeLifelines += lifelineElement
            `,
                {
                    docs: "Activates a lifeline at the most recent event you declared. Lifelines are ranges of time during which an instance is active. You can activate a lifeline multiple times simultaneously",
                    params: [
                        [0, "the instance to activate", instanceType],
                        [
                            "xshift",
                            "an optional shift on the x-axis when using multiple lifelines simultaneously on the same instance. Defaults to 'lifelineShift'",
                            optional(numberType)
                        ]
                    ],
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
                
                if(instance.activeLifelines.length == 0) {
                    error("Cannot deactivate instance '"+ instance.name + "' as it has not been activated")
                }
                lifeline = instance.activeLifelines.remove()
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
