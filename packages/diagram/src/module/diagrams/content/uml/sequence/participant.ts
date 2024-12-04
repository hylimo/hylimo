import { fun, id, InterpreterModule, numberType, optional, parse } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { participantType } from "./types.js";

/**
 * Module providing the shared logic for all sorts of sequence diagram participants - instances, actors, …<br>
 * Note that the caller is responsible for creating the element and registering the element under the given name beforehand.
 */
export const participantModule = InterpreterModule.create(
    "uml/sequence/participant",
    ["uml/sequence/defaultValues", "uml/associations"],
    [],
    [
        ...parse(
            `
                    scope.internal.createSequenceDiagramParticipant = {
                        (name, participant) = args
                        participant.name = name
                        participant.below = args.below

                        // Calculate y
                        event = scope.internal.lastSequenceDiagramEvent
                        participant.y = if(event != null) {
                            event.y
                        } { 0 }

                        // Calculate x
                        below = args.below
                        previous = scope.internal.lastSequenceDiagramParticipant
                        participant.x = if(below != null) {
                            below.x
                        } {
                            if(previous != null) {
                                previous.x + scope.instanceDistance
                            } {
                                0
                            }
                        }

                        participant.pos = scope.apos(participant.x, participant.y) 

                        //  Create the lifeline of this participant now so that it will always be rendered behind everything else
                        this.bottomcenter = scope.lpos(participant, 0.25)
                        participant.lifeline = scope[".."](bottomcenter, scope.rpos(bottomcenter, 0, scope.margin))
                        participant.events = list() // Needed for the autolayouting of events
                        participant.activeActivityIndicators = list() // Needed for the activity indicator autolayouting

                        scope.internal.sequenceDiagramParticipants += participant
                        scope.internal.lastSequenceDiagramParticipant = participant
                        participant
                    }
                `
        ),
        ...parse(
            `
                scope.styles {
                    cls("actor-element") {
                        vAlign = "bottom"
                    }
                }
            `
        ),
        id(SCOPE).assignField(
            "destroy",
            fun(
                `
              (participant) = args
              crossSize = args.crossSize ?? scope.destroyingCrossSize
              
              // Remove active activity indicators
              while({participant.activeActivityIndicators.length > 0}) {
                scope.deactivate(participant)
              }
              
              // Unregister the participant from growing larger with every event
              scope.internal.sequenceDiagramParticipants = scope.internal.sequenceDiagramParticipants.filter({
                (storedParticipant) = args
                participant != storedParticipant 
              })
              
              // Register the participant as "existed previously"
              scope.internal.previouslyExistingSequenceDiagramParticipants[participant.name] = participant
              
              // Draw the cross symbolizing the end of this participant, if there was any event so far
              originalArgs = args
              if(participant.events.length > 0) {
                cross = canvasElement(content = path(
                                  path = "M 0 0 L 1 1 M 1 0 L 0 1",
                                  class = list("destroy-cross-path")
                              ),
                              class = list("destroy-cross-path-element"),
                              width = crossSize,
                              height = crossSize,
                              vAlign = "center",
                              hAlign = "center")
                // We must change the position by '2*margin' compared to the last event as the lifeline continues to be drawn by two additional margins
                cross.pos = scope.rpos(participant.events.get(participant.events.length - 1), 0, 2*scope.margin)
                scope.internal.registerCanvasElement(cross, originalArgs, originalArgs.self)
              }
              `,
                {
                    docs: "Destroys a participant at the current event",
                    params: [
                        [0, "the participant to destroy", participantType],
                        [
                            "crossSize",
                            "the size of the cross to draw. Defaults to 'destroyingCrossSize'",
                            optional(numberType)
                        ]
                    ],
                    returns: "nothing"
                }
            )
        )
    ]
);
