import { fun, id, InterpreterModule } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";

const instanceType = null; // TODO

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
                
                lifelineElement = canvasElement(
                    content = rect(class = list("lifeline")),
                    class = list("lifeline-element")
                )
                
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
                    snippet: `("$1")`
                }
            )
        )
    ]
);
