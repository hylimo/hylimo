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
            `,
                {
                    docs: "Activates a lifeline. Lifelines are ranges of time during which an instance is active. You can activate a lifeline multiple times simultaneously",
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
