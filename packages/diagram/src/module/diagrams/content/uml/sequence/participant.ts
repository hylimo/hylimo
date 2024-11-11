import { InterpreterModule, parse } from "@hylimo/core";

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
                        
                        participant.pos = if(scope.internal.lastSequenceDiagramParticipant != null) {
                            scope.rpos(scope.internal.lastSequenceDiagramParticipant, scope.instanceDistance, 0)
                        } {
                            scope.apos(0, 0) // so that we don't get NPEs for the event layouting
                        }
                        
                        if(scope.internal.lastSequenceDiagramParticipant != null) {
                            participant.pos = scope.rpos(scope.internal.lastSequenceDiagramParticipant, scope.instanceDistance, 0)
                        }

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
        )
    ]
);
