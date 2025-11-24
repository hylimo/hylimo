import {
    booleanType,
    functionType,
    listType,
    literal,
    namedType,
    numberType,
    objectType,
    optional,
    or,
    stringType
} from "@hylimo/core";
import { canvasContentType, canvasPointType } from "../../../../base/types.js";

// Contains all Types used within sequence diagrams

/**
 * Stores the data for an activity indicator
 *
 * param explanations:
 * - `xShift`: how much this indicator was shifted on the x axis compared to its expected position (the center of the lifeline)
 * - `pos`: the starting position of this indicator seen from the top
 */
export const activityIndicatorType = namedType(
    objectType(
        new Map([
            ["xShift", numberType],
            ["leftX", numberType],
            ["rightX", numberType],
            ["pos", canvasPointType],
            ["startY", numberType]
        ])
    ),
    "UML sequence diagram activity indicator"
);

/**
 * Stores the data of a single participant.
 *
 * param explanations:
 * - `declaringPos`: The y position where this participant was declared (if any)
 * - `x`: index of the participant (0th, 1st, 2nd, ...)
 * - `referencePos`: A CanvasContent used as reference point for relative positioning
 * - `left`: function taking a position parameter and producing the left position of the participant at that position (differs from `x` if there are activity indicators)
 * - `right`: function taking a position parameter and producing the right position of the participant at that position (differs from `x` if there are activity indicators)
 * - `leftRightPositions`: List of {position, left, right} objects defining left/right offsets at each position. Before the first entry, 0/0 is used. The last entry remains active afterwards.
 */
export const participantType = namedType(
    objectType(
        new Map([
            ["lifeline", canvasContentType],
            ["activeActivityIndicators", listType(activityIndicatorType)],
            ["leftRightPositions", listType(objectType(new Map()))],
            ["declaringPos", optional(numberType)],
            ["x", numberType],
            ["referencePos", canvasContentType],
            ["left", functionType],
            ["right", functionType],
            ["alive", booleanType],
            ["participantType", or(literal("participant"), literal("virtualParticipant"))]
        ])
    ),
    "UML sequence diagram participant (instance or actor)"
);

/**
 * Stores a lost/found message
 *
 * param explanations:
 * - `distance`: length of the message, so value in pixels on the x-axis from where it is pointing at
 * - `externalMessageType`: the type of external message we have here to use in error messages
 */
export const externalMessageType = namedType(
    objectType(
        new Map([
            ["distance", numberType],
            ["externalMessageType", or(literal("lost"), literal("found"))]
        ])
    ),
    "Lost or Found message"
);

/**
 * Stores the data for a single fragment of one frame.
 *
 * param explanations:
 * - `topY`: the absolute `y` coordinate where the line separating this fragment from its predecessor should be drawn
 */
export const fragmentType = namedType(
    objectType(
        new Map([
            ["text", optional(stringType)],
            ["subtext", optional(stringType)],
            ["hasNameBorder", booleanType],
            ["hasLine", booleanType],
            ["nameElement", optional(canvasContentType)],
            ["subtextElement", optional(canvasContentType)],
            ["line", optional(canvasContentType)],
            ["topY", numberType]
        ])
    ),
    "UML sequence diagram frame fragment"
);

/**
 * Stores the data for a frame.
 *
 * param explanations:
 * - `topLeft`/`bottomRight`: The corners of this rectangle (except for some margin)
 */
export const frameType = namedType(
    objectType(
        new Map([
            ["top", numberType],
            ["right", participantType],
            ["bottom", numberType],
            ["left", participantType],
            ["x", numberType],
            ["width", numberType],
            ["fragments", listType(fragmentType)]
        ])
    ),
    "UML sequence diagram frame"
);
