import { booleanType, functionType, listType, numberType, objectType, optional, stringType } from "@hylimo/core";
import { canvasContentType, canvasPointType } from "../../../../base/types.js";

export const eventType = objectType(
    new Map([
        ["name", stringType],
        ["deltaY" /* to the last event */, numberType],
        ["y" /* to the root of the diagram */, numberType]
        // And a bunch of 'eventCoordinateType's, always under the names of the currently available participants, i.e. 'event.Bob'
    ]),
    "UML sequence diagram event"
);

export const eventCoordinateType = objectType(
    new Map([
        ["left" /* left xy position of the most recent activity indicator wrapped inside a function */, functionType],
        ["center" /* precise xy position of the event */, canvasPointType],
        ["right" /* right xy position of the most recent activity indicator wrapped inside a function */, functionType],
        ["parentEvent", eventType],
        ["participantName" /* i.e. 'Bob' when this object is called as 'event.Bob' */, stringType]
    ]),
    "UML sequence diagram event for a specific x coordinate"
);

export const activityIndicatorType = objectType(
    new Map([
        ["xshift", numberType],
        ["leftX", numberType],
        ["rightX", numberType],
        ["pos", canvasPointType]
    ]),
    "UML sequence diagram activity indicator"
);

export const participantType = objectType(
    new Map([
        ["name", stringType],
        ["lifeline", canvasContentType],
        ["events", listType(canvasPointType)],
        ["activeActivityIndicators", listType(activityIndicatorType)]
    ]),
    "UML sequence diagram participant (instance or actor)"
);

export const externalMessageType = objectType(
    new Map([
        ["distance", numberType], // on the x-axis compared to where it is pointing
        ["diameter", numberType],
        ["externalMessageType", booleanType] // The type of external message to use in error messages
    ]),
    "Lost or Found message"
);

export const frameType = objectType(
    new Map([
        ["text", optional(stringType)],
        ["subtext", optional(stringType)],
        ["hasIcon", optional(booleanType)],
        ["start", eventCoordinateType],
        ["end", eventCoordinateType]
    ]),
    "UML sequence diagram instance or actor"
);
