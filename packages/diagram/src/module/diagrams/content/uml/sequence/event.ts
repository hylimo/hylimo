import { fun, id, InterpreterModule, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";

/**
 * Defines an event.
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
