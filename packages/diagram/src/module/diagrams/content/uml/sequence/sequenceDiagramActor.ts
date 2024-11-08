import { fun, id, InterpreterModule, optional, parse, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";

/**
 * Module providing the UML 'actor' function for sequence diagrams - they differ from normal actors in that
 * - they store the line pointing down
 * - they receive a default position based on the previous elements
 */
export const sequenceDiagramActorModule = InterpreterModule.create(
    "uml/sequenceDiagramActor",
    ["uml/sequence/defaultValues", "uml/actor", "uml/sequence/participant", "uml/associations"],
    [],
    [
        id(SCOPE).assignField(
            "actor",
            fun(
                `
                    (name) = args
 
                    this.actor = scope.internal.createActor(name, args = args)
                    
                    // Actors have an optional name, so we must supply one for the first actor for the first actor in the diagram for example for arrows: 'event.User --> event.Shop' or 'activate(User)'
                    // Note however, that this name should not be displayed, so it cannot be used above
                    if(name == null) {
                        name = "User"
                        scope.internal.registerInDiagramScope(name, this.actor)
                    }
                    
                    scope.internal.createSequenceDiagramParticipant(name, this.actor)
                `,
                {
                    docs: "Creates an actor. An actor is a stickman with an optional name",
                    params: [[0, "the optional name of the actor", optional(stringType)]],
                    snippet: `("$1")`,
                    returns: "The created actor"
                }
            )
        ),
        ...parse(
            `
                scope.styles {
                    cls("actor-element") {
                        vAlign = "bottom"
                    }
                }
            `
        )
    ]
);
