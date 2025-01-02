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
            // And a bunch of dynamic 'eventCoordinateType's, always under the names of the currently available participants, i.e. 'event.Bob'
        ])
    ),
    "UML sequence diagram event"
);

/**
 * Stores an event coordinate, i.e. `instance("Bob") \n event("shopping").Bob`
 *
 * param explanations:
 * - `left`: function that produces a connectable point resembling the left x position of the underlying participant (at the given y coordinate) (differs from center when there is an active activity indicator)
 * - `center`: precise xy position of the event
 * - `right`: function that produces a connectable point resembling the right x position of the underlying participant (at the given y coordinate) (differs from center when there is an active activity indicator)
 * - `x`: Absolute `x` coordinate relative to the diagram root, equal to `center.x` (which we don't know due to the design of Hylimo)
 * - `y`: Absolute `y` coordinate relative to the diagram root, equal to `center.y` (which we don't know due to the design of Hylimo)
 * - `parentEvent`: Can only be `null` when a top level participant is used as event coordinate (object creation messages)
 * - `participantName`: i.e. 'Bob' when this object is called as 'event.Bob'
 */
export const eventCoordinateType = namedType(
    objectType(
        new Map([
            ["left", functionType],
            ["center", canvasPointType],
            ["right", functionType],
            ["x", numberType],
            ["y", numberType],
            ["parentEvent", optional(eventType)],
            ["participantName", stringType]
        ])
    ),
    "UML sequence diagram event for a specific x coordinate"
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

/**
 * Stores the data of a single participant.
 *
 * param explanations:
 * - `x`: absolute to the root of the diagram
 * - `y`: absolute to the root of the diagram
 */
export const participantType = namedType(
    objectType(
        new Map([
            ["name", stringType],
            ["lifeline", canvasContentType],
            ["events", listType(canvasPointType)],
            ["activeActivityIndicators", listType(activityIndicatorType)],
            ["x", numberType],
            ["y", numberType]
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
            ["topLeft", eventCoordinateType],
            ["bottomRight", eventCoordinateType],
            ["x", numberType],
            ["width", numberType],
            ["fragments", listType(fragmentType)]
        ])
    ),
    "UML sequence diagram frame"
);
