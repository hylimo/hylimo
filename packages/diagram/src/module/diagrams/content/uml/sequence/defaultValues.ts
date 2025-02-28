import { numberType, num, booleanType, bool } from "@hylimo/core";
import { ContentModule } from "../../contentModule.js";

/**
 * Provides a default margin - the additional (vertical) length that is added to each line on top of its normally calculated borders
 */
export const defaultValues = ContentModule.create(
    "uml/sequence/defaultValues",
    [],
    [],
    `
        // Used for internal layout
        scope.internal.sequenceDiagramParticipants = list() // Only the currently active participants, not including participants that were already terminated
        scope.internal.lastSequenceDiagramParticipant = null // the next element will be positioned at 'elem + rpos(elem, participantDistance, 0)'
        scope.internal.lastSequenceDiagramEvent = null // the next event will be positioned at 'event + rpos(event, 0, eventDistance)'
    `,
    [
        [
            "activityShift",
            "How far on the x axis subsequent simultaneously active activity indicators on the same participant are shifted",
            numberType,
            num(3)
        ],
        ["activityWidth", "How wide an activity indicator should be", numberType, num(10)],
        ["destroyingCrossSize", "The width and height of a participant-destruction cross", numberType, num(20)],
        [
            "enableDebugging",
            "Toggles the debugging mode for sequence diagrams printing additional info",
            booleanType,
            bool(false)
        ],
        ["eventDistance", "How far to move downward on the y axis with the next event", numberType, num(25)],
        ["externalMessageDiameter", "Width and height of the circle of lost and found messages", numberType, num(20)],
        [
            "externalMessageDistance",
            "How far away on the x axis a lost or found message should be drawn",
            numberType,
            num(95)
        ],
        ["frameMarginX", "Default margin to apply on the left and right side of frames", numberType, num(20)],
        ["frameMarginY", "Default margin to apply on the top and bottom of frames", numberType, num(5)],
        ["margin", "Margin to add to almost any interaction, i.e. to activity indicator endings", numberType, num(5)],
        ["participantDistance", "How far apart subsequent participants should be", numberType, num(200)]
    ]
);
