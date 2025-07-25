import { fun, functionType, id, numberType, optional } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { eventType, participantType } from "./types.js";
import { canvasContentType } from "../../../../base/types.js";
import { ContentModule } from "../../contentModule.js";

/**
 * Module providing the shared logic for all sorts of sequence diagram participants - instances, actors, …<br>
 * Note that the caller is responsible for creating the element and registering the element under the given name beforehand.
 */
export const createParticipantMoule = ContentModule.create(
    "uml/sequence/createParticipant",
    ["uml/sequence/defaultValues"],
    [],
    [
        id(SCOPE)
            .field("internal")
            .assignField(
                "createSequenceDiagramParticipant",
                fun(
                    [
                        `
                            (participantElement) = args
                            participantElement.alive = true
                            participantElement.below = args.below
                            participantElement.events = []

                            // Calculate y
                            event = scope.internal.lastSequenceDiagramEvent
                            participantElement.y = if(event != null) {
                                event.y
                            } { 0 }
                            participantElement.declaringEvent = event

                            // Calculate x
                            below = args.below
                            previous = scope.internal.lastSequenceDiagramParticipant
                            participantElement.x = if(below != null) {
                                below.x
                            } {
                                if(previous != null) {
                                    previous.x + scope.internal.config.participantDistance
                                } {
                                    0
                                }
                            }

                            // Assign the current event to the list of data when this participant was active, when it exists
                            if(event != null) {
                                participantElement.events[event.name] = [ activityIndicators = list()]
                            }

                            participantElement.pos = scope.apos(participantElement.x, participantElement.y) 

                            // Create the lifeline of this participantElement now so that it will always be rendered behind everything else
                            this.bottomcenter = scope.lpos(participantElement, 0.25)
                            participantElement.lifeline = scope[".."](bottomcenter, scope.rpos(bottomcenter, 0, scope.internal.config.margin))
                            participantElement.activeActivityIndicators = list() // Needed for the activity indicator autolayouting

                            scope.internal.sequenceDiagramParticipants += participantElement
                            scope.internal.lastSequenceDiagramParticipant = participantElement

                            // To calculate an event specific coordinate, we must first know how much space the active activity indicators take up
                            // Calculate the left coordinate of this participant at the current event - especially for when there are currently activity indicators
                            participantElement.left = {
                                event = scope.internal.lastSequenceDiagramEvent
                                if((event == null) || (event == participantElement.declaringEvent)) {
                                    scope.lpos(participantElement, 0.5) // On the left of the participant
                                } {
                                    leftX = participantElement.x + (if(participantElement.activeActivityIndicators.length > 0) { participantElement.activeActivityIndicators.get(participantElement.activeActivityIndicators.length - 1).leftX } { 0 })
                                    scope.apos(leftX, event.y)
                                }
                            }
                            participantElement.center = pos
                            participantElement.right = {
                                event = it ?? scope.internal.lastSequenceDiagramEvent
                                if((event == null) || (event == participantElement.declaringEvent)) {
                                    scope.lpos(participantElement, 0.0) // On the right of the participant
                                } {
                                    rightX =  participantElement.x + (if(participantElement.activeActivityIndicators.length > 0) { participantElement.activeActivityIndicators.get(participantElement.activeActivityIndicators.length - 1).rightX } { 0 })
                                    scope.apos(rightX, event.y)
                                }}

                            participantElement.parentEvent = event

                            // We want to bottom align top level participants, and only them
                            // Later participants should be center aligned
                            if(event == null) {
                                participantElement.class += "top-level-participant"
                            } {
                                participantElement.class += "non-top-level-participant"
                            }

                            participantElement.edits["toolbox/Participant/Activate"] = createAddEdit(
                                scope.internal.callback,
                                "'activate(' & expression & ')'"
                            )
                                participantElement.edits["toolbox/Participant/Deactivate"] = createAddEdit(
                                scope.internal.callback,
                                "'deactivate(' & expression & ')'"
                            )
                                participantElement.edits["toolbox/Participant/Destroy"] = createAddEdit(
                                scope.internal.callback,
                                "'destroy(' & expression & ')'"
                            )
                        `,
                        id("participantElement").assignField(
                            "on",
                            fun(
                                `
                                    event = it
                                    participant = participantElement
                                    left = {
                                        if(event == participant.declaringEvent) {
                                            scope.lpos(participant, 0.5) // On the left of the participant
                                        } {
                                            if(participant.events[event.name] == null) {
                                                scope.error("Participant does not have data for event '\${event.name}'")
                                            }
                                            activityIndicators = participant.events[event.name].activityIndicators
                                            leftX = participant.x + (if(activityIndicators.length > 0) { activityIndicators.get(activityIndicators.length - 1).leftX } { 0 })
                                            scope.apos(leftX, event.y)
                                        }
                                    }
                                    right = {
                                        if(event == participant.declaringEvent) {
                                            scope.lpos(participant, 0) // On the right of the participant
                                        } {
                                            if(participant.events[event.name] == null) {
                                                scope.error("Participant does not have data for event '\${event.name}'")
                                            }
                                            activityIndicators = participant.events[event.name].activityIndicators
                                            rightX = participant.x + (if(activityIndicators.length > 0) { activityIndicators.get(activityIndicators.length - 1).rightX } { 0 })
                                            scope.apos(rightX, event.y)
                                        }
                                    }
                                    scope.virtualParticipant(left = left, right = right, x = participant.x)
                                `,
                                {
                                    docs: "Creates a virtual participant positioned at the given event. Can be used to create messages to arbitrary points in time (i.e. events that have a delay until they arrive)",
                                    params: [[0, "the event where to pinpoint the participant", eventType]],
                                    returns: "the new virtual participant to use for i.e. messages",
                                    snippet: "($1)"
                                }
                            )
                        ),
                        `
                            participantElement
                        `
                    ],
                    {
                        docs: "Enriches the given already created participant with all sequence diagram specific data",
                        params: [
                            [0, "the already created participant element", canvasContentType],
                            [
                                "below",
                                "another participant below which to position this participant",
                                optional(participantType)
                            ]
                        ],
                        returns: "the participant"
                    }
                )
            ),
        id(SCOPE).assignField(
            "virtualParticipant",
            fun(
                `
                    lifeline = canvasElement()
                    left = args.left
                    right = args.right
                    x = args.x ?? 0
                    [name = "artificially created participant", lifeline = lifeline, activeActivityIndicators = list(), declaringEvent = null, alive = false, x = x, y = 0, left = left, right = right]
                `,
                {
                    docs: "Creates a virtual participant that is not visible in the diagram but can be used for things that need to differentiate between a 'left' and a 'right' position",
                    params: [
                        ["left", "a function producing the left point of this participant", functionType],
                        ["right", "a function producing the right point of this participant", functionType],
                        [
                            "x",
                            "the center x coordinate of this participant, if present. Should be set if you want the detection if a message has been sent by the same participant to work correctly",
                            optional(numberType)
                        ]
                    ],
                    returns: "The created virtual participant",
                    snippet: "(left = $1, right = $2)"
                }
            )
        ),

        id(SCOPE).assignField(
            "destroy",
            fun(
                `
                    (participant) = args
                    crossSize = args.crossSize ?? scope.internal.config.destroyingCrossSize

                    if(participant.alive != true) {
                        scope.error("participant has already been destroyed")
                    }

                    // Remove active activity indicators
                    while({participant.activeActivityIndicators.length > 0}) {
                        scope.deactivate(participant)
                    }

                    // Unregister the participant from growing larger with every event
                    scope.internal.sequenceDiagramParticipants = scope.internal.sequenceDiagramParticipants.filter({
                        (storedParticipant) = args
                        participant != storedParticipant 
                    })
                    
                    participant.alive = false

                    // Draw the cross symbolizing the end of this participant, if there was any event so far
                    originalArgs = args
                    if(participant.declaringEvent != scope.internal.lastSequenceDiagramEvent) {
                        cross = canvasElement(
                            contents = list(
                                path(
                                    path = "M 0 0 L 1 1 M 1 0 L 0 1",
                                    class = list("destroy-cross-path")
                                )
                            ),
                            class = list("destroy-cross-path-element"),
                            width = crossSize,
                            height = crossSize
                        )

                        cross.pos = scope.apos(participant.x, scope.internal.lastSequenceDiagramEvent.y)
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
        ),
        `
            scope.styles {
                cls("top-level-participant") {
                    vAlign = "bottom"
                }
                cls("non-top-level-participant") {
                    vAlign = "center"
                }
                cls("destroy-cross-path-element") {
                    vAlign = "center"
                    hAlign = "center"
                }
            }
        `
    ]
);
