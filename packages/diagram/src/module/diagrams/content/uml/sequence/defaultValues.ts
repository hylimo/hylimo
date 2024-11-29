import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Provides a default margin - the additional (vertical) length that is added to each line on top of its normally calculated borders
 */
export const defaultValues = InterpreterModule.create(
    "uml/sequence/defaultValues",
    [],
    [],
    [
        ...parse(`
        // Exposed and changable variables
        scope.margin = 5
        scope.activityWidth = 10
        scope.activityShift = 3
        scope.instanceDistance = 200
        scope.eventDistance = 30
        scope.destroyingCrossSize = 20
        scope.externalMessageDiameter = 20
        // This one is calculated so that the resulting dot will be centered on the '100' grid lines when connecting against an activity indicator
        // If you want to center it against a lifeline only, use '100' instead
        scope.externalMessageDistance = 100 - (scope.activityWidth / 2)
        
        // Used for internal layout
        scope.internal.sequenceDiagramParticipants = list() // Only the currently active participants, not including participants that were already terminated
        scope.internal.previouslyExistingSequenceDiagramParticipants = [] // Only the participants that have been deleted, mapped by their name
        scope.internal.lastSequenceDiagramParticipant = null // the next element will be positioned at 'elem + rpos(elem, instanceDistance, 0)'
        scope.internal.lastSequenceDiagramEvent = null // the next event will be positioned at 'event + rpos(event, 0, eventDistance)'
    `)
    ]
);
