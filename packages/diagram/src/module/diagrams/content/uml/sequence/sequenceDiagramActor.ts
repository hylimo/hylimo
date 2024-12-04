import { fun, id, InterpreterModule, optional, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { participantType } from "./types.js";

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
                    
                    scope.internal.createSequenceDiagramParticipant(name, this.actor, below = args.below)
                `,
                {
                    docs: "Creates an actor. An actor is a stickman with an optional name",
                    params: [
                        [0, "the optional name of the actor", optional(stringType)],
                        [
                            "below",
                            "the optional participant below which the actor should be placed. If set, this actor will have the same x coordinate as the given value and the y coordinate of the current event",
                            optional(participantType)
                        ]
                    ],
                    snippet: `($1)`,
                    returns: "The created actor"
                }
            )
        )
    ]
);
