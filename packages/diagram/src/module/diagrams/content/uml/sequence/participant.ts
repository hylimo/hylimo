import { fun, id, InterpreterModule, numberType, optional } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { participantType } from "./types.js";
import { canvasPointType } from "../../../../base/types.js";

/**
 * Module providing the shared logic for all sorts of sequence diagram participants - instances, actors, …<br>
 * Note that the caller is responsible for creating the element and registering the element under the given name beforehand.
 */
export const participantModule = InterpreterModule.create(
    "uml/sequence/participant",
    ["uml/sequence/defaultValues"],
    [],
    [
        `
            scope.internal.createSequenceDiagramParticipant = {
                (name, participantElement) = args
                participantElement.alive = true
                participantElement.name = name
                participantElement.below = args.below

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
                        previous.x + scope.participantDistance
                    } {
                        0
                    }
                }

                participantElement.pos = scope.apos(participantElement.x, participantElement.y) 

                // Create the lifeline of this participantElement now so that it will always be rendered behind everything else
                this.bottomcenter = scope.lpos(participantElement, 0.25)
                participantElement.lifeline = scope[".."](bottomcenter, scope.rpos(bottomcenter, 0, scope.margin))
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
                participantElement.participantName = participantElement.name

                // We want to bottom align top level participants, and only them
                // Later participants should be center aligned
                if(event == null) {
                    participantElement.class += "top-level-participant"
                } {
                    participantElement.class += "non-top-level-participant"
                }
                
                scope.internal.canvasAddEdits["toolbox/Activate instance or actor/\${name}"] = "'activate(' & \${nameToJsonataStringLiteral(name)} & ')'"
                scope.internal.canvasAddEdits["toolbox/Deactive instance or actor/\${name}"] = "'deactivate(' & \${nameToJsonataStringLiteral(name)} & ')'"
                scope.internal.canvasAddEdits["toolbox/Destroy instance or actor/\${name}"] = "'destroy(' & \${nameToJsonataStringLiteral(name)} & ')'"

                participantElement
            }

            scope.styles {
                cls("top-level-participant") {
                    vAlign = "bottom"
                }
                cls("non-top-level-participant") {
                    vAlign = "center"
                }
            }
        `,
        id(SCOPE).assignField(
            "virtualParticipant",
            fun(
                `
                lifeline = canvasElement()
                left = it
                right = args[1]
                [name = "artificially created participant", lifeline = lifeline, activeActivityIndicators = list(), declaringEvent = null, alive = false, x = 0, y = 0, left = { left }, right = { right }]
          `,
                {
                    docs: "Creates a virtual participant that is not visible in the diagram but can be used for things that need to differentiate between a 'left' and a 'right' position",
                    params: [
                        [0, "the left point of this participant", canvasPointType],
                        [1, "the right point of this participant", canvasPointType]
                    ],
                    returns: "The created virtual participant",
                    snippet: "($1, $2)"
                }
            )
        ),

        id(SCOPE).assignField(
            "destroy",
            fun(
                `
                (participant) = args
                crossSize = args.crossSize ?? scope.destroyingCrossSize

                if(participant.alive != true) {
                    scope.error("\${participant.name} has already been destroyed")
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
                        content = path(
                            path = "M 0 0 L 1 1 M 1 0 L 0 1",
                            class = list("destroy-cross-path")
                        ),
                        class = list("destroy-cross-path-element"),
                        width = crossSize,
                        height = crossSize
                    )
                    scope.styles {
                        cls("destroy-cross-path-element") {
                            vAlign = "center"
                            hAlign = "center"
                        }
                    }

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
        )
    ]
);
