import { ContentModule } from "../../contentModule.js";

/**
 * Provides a default margin - the additional (vertical) length that is added to each line on top of its normally calculated borders
 */
export const defaultValues = ContentModule.create(
    "uml/sequence/defaultValues",
    [],
    [],
    `
        // Exposed and changable variables
        scope.activityShift = 3
        scope.activityWidth = 10
        scope.destroyingCrossSize = 20
        scope.enableDebugging = false
        scope.eventDistance = 25 /* Not 30 as that looks bad on the lifeline - that is a dotted line, and the dots always seem to be missing on 30pixels */
        scope.externalMessageDiameter = 20
        // This one is calculated so that the resulting dot will be centered on the '100' grid lines when connecting against an activity indicator
        // If you want to center it against a lifeline only, use '100' instead
        scope.externalMessageDistance = 100 - (scope.activityWidth / 2)
        scope.margin = 5
        scope.frameMarginX = 20
        scope.frameMarginY = scope.margin
        scope.participantDistance = 200

        // Used for internal layout
        scope.internal.sequenceDiagramParticipants = list() // Only the currently active participants, not including participants that were already terminated
        scope.internal.lastSequenceDiagramParticipant = null // the next element will be positioned at 'elem + rpos(elem, participantDistance, 0)'
        scope.internal.lastSequenceDiagramEvent = null // the next event will be positioned at 'event + rpos(event, 0, eventDistance)'
    `
);
