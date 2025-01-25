import { fun, functionType, id, InterpreterModule, optional, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { participantType } from "./types.js";
import { actorToolboxEdits } from "../actor.js";

/**
 * Module providing the UML 'actor' function for sequence diagrams - they differ from normal actors in that
 * - they store the line pointing down
 * - they receive a default position based on the previous elements
 */
export const sequenceDiagramActorModule = InterpreterModule.create(
    "uml/sequence/actor",
    ["uml/sequence/defaultValues", "uml/actor", "uml/sequence/participant", "uml/sequence/instance"],
    [],
    [
        id(SCOPE).assignField(
            "actor",
            fun(
                `
                    (originalName, callback) = args
                    argsCopy = args

                    // We don't want to display the actor name when attributes are present. That will be handled by the underlying instance
                    actorName = if(callback != null) { null } { originalName }
                    this.actor = scope.internal.createActor(actorName, args = args)
                    name = originalName
                    
                    // Actors have an optional name, so we must supply one for the first actor for the first actor in the diagram for example for arrows: 'event.User --> event.Shop' or 'activate(User)'
                    // Note however, that this name should not be displayed, so it cannot be done before the actor was created
                    if(name == null) {
                        name = "User"
                    }

                    // Actors have a specialty: When they contain entity values, they will be rendered as an instance with a stickman on top
                    if(callback == null) {
                        scope.internal.registerInDiagramScope(name, this.actor)
                        scope.internal.createSequenceDiagramParticipant(name, this.actor, below = argsCopy.below)
                    } {
                        instance = scope.instance(name, callback)
                        actor.pos = scope.lpos(instance, 0.75)
                        actor.instance = instance
                        actor.class += "instanced-actor-element"
                        actor.content.class += "instanced-actor"

                        // Manually copy all attributes from the participant type (the instance) to this actor so that the actor is a participant too
                        actor.name = instance.name
                        actor.lifeline = instance.lifeline
                        actor.events = instance.events
                        actor.activeActivityIndicators = instance.activeActivityIndicators
                        actor.x = instance.x
                        actor.y = instance.y
                        actor.alive = instance.alive
                        // TODO: Desync possible between actor and its instance when deactivating it
                    }

                    this.actor
                `,
                {
                    docs: "Creates an actor. An actor is a stickman with an optional name",
                    params: [
                        [0, "the optional name of the actor", optional(stringType)],
                        [1, "the optional attributes of this actor", optional(functionType)],
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
        ),
        `
            scope.styles {
                cls("instanced-actor-element") {
                    vAlign = "bottom"
                }
            }
        `,
        ...actorToolboxEdits(false)
    ]
);
