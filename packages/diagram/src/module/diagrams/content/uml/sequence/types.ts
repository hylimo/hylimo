import { booleanType, functionType, listType, numberType, objectType, optional, or, stringType } from "@hylimo/core";
import { canvasContentType, canvasPointType } from "../../../../base/types.js";

// Contains all Types used within sequence diagrams

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
        [
            "left" /* participant element or left xy position of the most recent activity indicator wrapped inside a function, so something that can create a connection */,
            functionType
        ],
        ["center" /* precise xy position of the event */, canvasPointType],
        [
            "right" /* participant element or right xy position of the most recent activity indicator wrapped inside a function, so something that can create a connection */,
            functionType
        ],
        ["x" /* from the center to the root of the diagram */, numberType],
        ["y" /* from the center to the root of the diagram */, numberType],
        ["parentEvent", optional(eventType) /* null for top level participants*/],
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
        ["activeActivityIndicators", listType(activityIndicatorType)],
        ["x" /* to the root of the diagram */, numberType],
        ["y" /* to the root of the diagram */, numberType]
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

export const fragmentType = objectType(
    new Map([
        ["text", optional(stringType)],
        ["subtext", optional(stringType)],
        ["hasNameBorder", booleanType],
        ["hasLine", booleanType],
        ["nameElement", optional(canvasContentType)],
        ["subtextElement", optional(canvasContentType)],
        ["line", optional(canvasContentType)],
        [
            "topY", // the y-coordinate (event) where to draw the line separating the previous fragment from this fragment
            or(eventCoordinateType, canvasPointType, numberType)
        ]
    ]),
    "UML sequence diagram frame"
);

export const frameType = objectType(
    new Map([
        ["topLeft", eventCoordinateType],
        ["bottomRight", eventCoordinateType],
        ["x", numberType],
        ["width", numberType],
        ["fragments", listType(fragmentType)]
    ]),
    "UML sequence diagram frame"
);
