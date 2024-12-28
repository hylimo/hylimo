import { fun, id, InterpreterModule, numberType, optional } from "@hylimo/core";
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
        `
        scope.internal.createSequenceDiagramParticipant = {
            (name, participantElement) = args
            participantElement.name = name
            participantElement.below = args.below

            // Calculate y
            event = scope.internal.lastSequenceDiagramEvent
            participantElement.y = if(event != null) {
                event.y
            } { 0 }

            // Calculate x
            below = args.below
            previous = scope.internal.lastSequenceDiagramParticipant
            participantElement.x = if(below != null) {
                below.x
            } {
                if(previous != null) {
                    previous.x + scope.participantDistance
                } {
                    0
                }
            }

            participantElement.pos = scope.apos(participantElement.x, participantElement.y) 

            //  Create the lifeline of this participantElement now so that it will always be rendered behind everything else
            this.bottomcenter = scope.lpos(participantElement, 0.25)
            participantElement.lifeline = scope[".."](bottomcenter, scope.rpos(bottomcenter, 0, scope.margin))
            participantElement.events = list() // Needed for the autolayouting of events
            participantElement.activeActivityIndicators = list() // Needed for the activity indicator autolayouting

            scope.internal.sequenceDiagramParticipants += participantElement
            scope.internal.lastSequenceDiagramParticipant = participantElement

            // the following attributes are necessary to cast the participantElement into a (pseudo) event that can be the target of associations as well
            // passing only the participant for left and right is correct as Hylimo uses the center point of canvas elements for connections and stops the arrow on the element border
            participantElement.left = { participantElement }
            participantElement.center = pos
            participantElement.right = { participantElement }
            participantElement.parentEvent = event
            participantElement.participantName = participantElement.name

            // We want to bottom align top level participants, and only them
            // Later participants should be center aligned
            if(event == null) {
              participantElement.content.class += "top-level-participant"
            } {
              participantElement.content.class += "non-top-level-participant"
            }

            participantElement
        }

        scope.styles {
            cls("top-level-participant") {
                vAlign = "bottom"
            }
            cls("non-top-level-participant") {
                vAlign = "center"
            }
        }
        `,
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
                              height = crossSize
                              )
                scope.styles {
                  cls("destroy-cross-path-element") {
                    vAlign = "center"
                    hAlign = "center"
                  }
                }

                // We must change the position by '2*margin' compared to the last event as the lifeline continues to be drawn by two additional margins
                cross.pos = scope.rpos(participant.events.get(participant.events.length - 1), 0, 2*scope.margin)
                scope.internal.registerCanvasElement(cross, originalArgs, originalArgs.self)

                // Also shorten the lifeline if necessary
                participant.lifeline.contents.get(participant.lifeline.contents.length - 1).end = cross.pos
                
                cross
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
                    returns: "the created cross"
                }
            )
        )
    ]
);
