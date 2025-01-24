import {
    booleanType,
    functionType,
    listType,
    literal,
    mapType,
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
 * Stores an event, i.e. `event("startShopping")`.
 *
 * param explanations:
 * - `deltaY`: y coordinate relative to the previous event
 * - `y`: absolute y coordinate
 */
export const eventType = namedType(
    objectType(
        new Map([
            ["name", stringType],
            ["deltaY", numberType],
            ["y", numberType]
        ])
    ),
    "UML sequence diagram event"
);

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
            ["pos", canvasPointType]
        ])
    ),
    "UML sequence diagram activity indicator"
);

const participantEventDetails = namedType(
    objectType(new Map([["activityIndicators", listType(activityIndicatorType)]])),
    "activity indicators at one event for one participant"
);

/**
 * Stores the data of a single participant.
 *
 * param explanations:
 * - `declaringEvent`: The event below which this participant was declared, if present
 * - `x`: absolute to the root of the diagram
 * - `y`: absolute to the root of the diagram
 * - `left`: function taking no parameter and producing the left position of the participant at the current event (differs from `x` if there are activity indicators)
 * - `right`: function taking no parameter and producing the right position of the participant at the current event (differs from `x` if there are activity indicators)
 * - `events`: Each event name where the participant was active mapped to the data of this participant at this event (i.e. which activity indicators were active)
 */
export const participantType = namedType(
    objectType(
        new Map([
            ["name", stringType],
            ["lifeline", canvasContentType],
            ["events", mapType(participantEventDetails)],
            ["activeActivityIndicators", listType(activityIndicatorType)],
            ["declaringEvent", optional(eventType)],
            ["x", numberType],
            ["y", numberType],
            ["left", functionType],
            ["right", functionType],
            ["alive", booleanType]
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
            ["diameter", numberType],
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
            ["top", eventType],
            ["right", participantType],
            ["bottom", eventType],
            ["left", participantType],
            ["x", numberType],
            ["width", numberType],
            ["fragments", listType(fragmentType)]
        ])
    ),
    "UML sequence diagram frame"
);
