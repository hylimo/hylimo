import { fun, id, InterpreterModule, optional, parse, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";

/**
 * Module providing the UML 'actor' function for sequence diagrams - they differ from normal actors in that
 * - they store the line pointing down
 * - they receive a default position based on the previous elements
 */
export const sequenceDiagramActorModule = InterpreterModule.create(
    "uml/sequenceDiagramActor",
    ["uml/sequence/defaultValues", "uml/actor", "uml/associations"],
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
                    this.actor.name = name
                    
                    this.actor.pos = if(scope.internal.lastSequenceDiagramElement != null) {
                        scope.rpos(scope.internal.lastSequenceDiagramElement, scope.instanceDistance, 0)
                    } {
                        scope.apos(0, 0) // so that we don't get NPEs for the event layouting
                    }
                    
                    if(scope.internal.lastSequenceDiagramElement != null) {
                        this.actor.pos = scope.rpos(scope.internal.lastSequenceDiagramElement, scope.instanceDistance, 0)
                    }

                    //  Create the line of this actor now so that it will always be rendered behind everything else
                    this.bottomcenter = scope.lpos(this.actor, 0.25)
                    this.actor.lineStart = this.bottomcenter
                    this.actor.line = scope[".."](bottomcenter, scope.rpos(bottomcenter, 0, scope.margin))
                    this.actor.events = list() // Needed for the autolayouting of events

                    scope.internal.sequenceDiagramElements += this.actor
                    scope.internal.lastSequenceDiagramElement = this.actor
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
