import { fun, functionType, id, numberType, optional } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { participantType } from "./types.js";
import { canvasContentType } from "../../../../base/types.js";
import { ContentModule } from "../../contentModule.js";
import { DefaultEditTypes } from "@hylimo/diagram-common";

/**
 * Module providing the shared logic for all sorts of sequence diagram participants - instances, actors, …<br>
 * Note that the caller is responsible for creating the element and registering the element under the given name beforehand.
 */
export const createParticipantMoule = ContentModule.create(
    "uml/sequence/createParticipant",
    ["uml/sequence/defaultValues", "uml/sequence/diagramState"],
    [],
    [
        `
            scope.internal.findParticipantLeftRightPosition = {
                (participant, position, field) = args
                this.offset = 0
                this.i = participant.leftRightPositions.length - 1
                while {i >= 0} {
                    this.entry = participant.leftRightPositions.get(i)
                    if(entry.position <= position) {
                        offset = entry.get(field)
                        i = -1
                    } {
                        i = i - 1
                    }
                }
                offset
            }
        `,
        id(SCOPE)
            .field("internal")
            .assignField(
                "createSequenceDiagramParticipant",
                fun(
                    [
                        `
                            (participantElement) = args
                            participantElement.alive = true
                            participantElement.participantType = "participant"
                            participantElement.below = args.below

                            this.at = args.at
                            this.after = args.after
                            this.below = args.below
                            this.priority = if(below != null) { 3 } { 0 }
                            
                            this.currentPos = scope.internal.calculatePosition(at = at, after = after, priority = priority)
                            participantElement.declaringPos = currentPos

                            this.previous = scope.internal.lastSequenceDiagramParticipant
                            participantElement.x = if(below != null) {
                                below.x
                            } {
                                if(previous != null) {
                                    previous.x + 1
                                } {
                                    0
                                }
                            }

                            this.margin = args.margin
                            if(below != null) {
                                participantElement.referencePos = below.referencePos
                                participantElement.leftRightPositions = below.leftRightPositions
                            } {
                                if(previous != null) {
                                    participantElement.referencePos = scope.rpos(
                                        previous.referencePos,
                                        margin ?? scope.internal.config.participantMargin,
                                        0
                                    )
                                } {
                                    participantElement.referencePos = participantElement
                                }
                                participantElement.leftRightPositions = list()
                            }

                            participantElement.pos = if(below != null) {
                                scope.rpos(participantElement.referencePos, 0, currentPos)
                            } {
                                if (previous != null) {
                                    scope.rpos(participantElement.referencePos, 0, currentPos)
                                } {
                                    scope.apos(0, 0)
                                }
                            }
                            
                            if (below != null) {
                                participantElement.pos.edits["${DefaultEditTypes.MOVE_Y}"] = createAdditiveEdit(at ?? after, "dy")
                            } {
                                if(previous != null) {
                                    participantElement.referencePos.edits["${DefaultEditTypes.MOVE_X}"] = createAdditiveEdit(
                                        margin,
                                        if (margin != null) { "dx" } { "(dx + \${scope.internal.config.participantMargin})" }
                                    )
                                    participantElement.referencePos.edits["${DefaultEditTypes.MOVE_Y}"] = createAdditiveEdit(at ?? after, "dy")
                                }
                            }

                            this.bottomcenter = scope.lpos(participantElement, 0.25)
                            if(scope.internal.lifelineTargetPos == null) {
                                scope.internal.lifelineTargetPos = scope.rpos(participantElement.referencePos, 0, 0)
                            }
                            participantElement.lifeline = scope.internal.createConnection(
                                bottomcenter,
                                scope.rpos(bottomcenter, scope.internal.lifelineTargetPos),
                                list("lifeline-connection"),
                                null,
                                scope,
                                lineType = "line"
                            )
                            participantElement.activeActivityIndicators = list()

                            scope.internal.sequenceDiagramParticipants += participantElement
                            scope.internal.lastSequenceDiagramParticipant = participantElement

                            // To calculate a position specific coordinate, we must first know how much space the active activity indicators take up
                            // Calculate the left coordinate of this participant at a given position - especially for when there are currently activity indicators
                            participantElement.left = {
                                this.position = scope.internal.calculatePosition(priority = 3)
                                scope.internal.updateSequenceDiagramPosition(position)
                                this.self = args.self
                                if(position == participantElement.declaringPos) {
                                    scope.lpos(participantElement, 0.5)
                                } {
                                    this.leftOffset = scope.internal.findParticipantLeftRightPosition(participantElement, position, "left")
                                    this.newPos = scope.rpos(participantElement.referencePos, leftOffset, position)
                                    newPos.edits["${DefaultEditTypes.MOVE_Y}"] = createAppendEdit(self, "'.after(' & dy & ')'")
                                    newPos
                                }
                            }
                            
                            participantElement.right = {
                                this.position = scope.internal.calculatePosition(priority = 3)
                                scope.internal.updateSequenceDiagramPosition(position)
                                this.self = args.self
                                if(position == participantElement.declaringPos) {
                                    scope.lpos(participantElement, 0)
                                } {
                                    this.rightOffset = scope.internal.findParticipantLeftRightPosition(participantElement, position, "right")
                                    this.newPos = scope.rpos(participantElement.referencePos, rightOffset, position)
                                    newPos.edits["${DefaultEditTypes.MOVE_Y}"] = createAppendEdit(self, "'.after(' & dy & ')'")
                                    newPos
                                }
                            }

                            scope.internal.updateSequenceDiagramPosition(currentPos)

                            if(currentPos == 0) {
                                participantElement.class += "top-level-participant"
                                scope.internal.registerTargetPosition(scope.internal.config.initialMargin, 0)
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
                            "at",
                            fun(
                                `
                                    (position) = args
                                    
                                    this.participant = participantElement
                                    
                                    this.left = {
                                        if(position == null) {
                                            scope.lpos(participant, 0.5)
                                        } {
                                            calculatedPosition = scope.internal.calculatePosition(at = position, priority = 3)
                                            scope.internal.updateSequenceDiagramPosition(calculatedPosition)
                                            this.leftOffset = scope.internal.findParticipantLeftRightPosition(participant, calculatedPosition, "left")
                                            this.pos = scope.rpos(participant.referencePos, leftOffset, calculatedPosition)
                                            pos.edits["${DefaultEditTypes.MOVE_Y}"] = createAdditiveEdit(calculatedPosition, "dy")
                                            pos
                                        }
                                    }
                                    this.right = {
                                        if(position == null) {
                                            scope.lpos(participant, 0)
                                        } {
                                            calculatedPosition = scope.internal.calculatePosition(at = position, priority = 3)
                                            scope.internal.updateSequenceDiagramPosition(calculatedPosition)
                                            this.rightOffset = scope.internal.findParticipantLeftRightPosition(participant, calculatedPosition, "right")
                                            this.pos = scope.rpos(participant.referencePos, rightOffset, calculatedPosition)
                                            pos.edits["${DefaultEditTypes.MOVE_Y}"] = createAdditiveEdit(calculatedPosition, "dy")
                                            pos
                                        }
                                    }
                                    scope.virtualParticipant(left = left, right = right, x = participant.x)
                                `,
                                {
                                    docs: "Creates a virtual participant positioned at a specific position. If no position is provided, the participant itself will be used (positioned at its declaring position). Can be used to create messages to arbitrary points in time",
                                    params: [
                                        [
                                            0,
                                            "the absolute y position where to pinpoint the participant. If not provided, uses the participant itself",
                                            optional(numberType)
                                        ]
                                    ],
                                    returns: "the new virtual participant to use for i.e. messages",
                                    snippet: "($1)"
                                }
                            )
                        ),
                        id("participantElement").assignField(
                            "after",
                            fun(
                                `
                                    (offset) = args
                                    
                                    this.participant = participantElement
                                    
                                    this.left = {
                                        calculatedPosition = scope.internal.calculatePosition(after = offset, priority = 3)
                                        scope.internal.updateSequenceDiagramPosition(calculatedPosition)
                                        leftOffset = scope.internal.findParticipantLeftRightPosition(participant, calculatedPosition, "left")
                                        this.pos = scope.rpos(participant.referencePos, leftOffset, calculatedPosition)
                                        pos.edits["${DefaultEditTypes.MOVE_Y}"] = createAdditiveEdit(offset, "dy")
                                        pos
                                    }
                                    this.right = {
                                        calculatedPosition = scope.internal.calculatePosition(after = offset, priority = 3)
                                        scope.internal.updateSequenceDiagramPosition(calculatedPosition)
                                        rightOffset = scope.internal.findParticipantLeftRightPosition(participant, calculatedPosition, "right")
                                        this.pos = scope.rpos(participant.referencePos, rightOffset, calculatedPosition)
                                        pos.edits["${DefaultEditTypes.MOVE_Y}"] = createAdditiveEdit(offset, "dy")
                                        pos
                                    }
                                    scope.virtualParticipant(left = left, right = right, x = participant.x)
                                `,
                                {
                                    docs: "Creates a virtual participant positioned at an offset from the current position. Can be used to create messages to arbitrary points in time",
                                    params: [
                                        [
                                            0,
                                            "the offset from the current position where to pinpoint the participant",
                                            numberType
                                        ]
                                    ],
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
                                "at",
                                "the absolute y position where to create the participant. If set, takes priority over 'after'",
                                optional(numberType)
                            ],
                            [
                                "after",
                                "the relative y offset from the current position. Only used if 'at' is not set",
                                optional(numberType)
                            ],
                            [
                                "below",
                                "another participant below which to position this participant",
                                optional(participantType)
                            ],
                            [
                                "margin",
                                "horizontal margin between this and the previous participant. Defaults to 'participantMargin'",
                                optional(numberType)
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
                    [x = args.x, left = args.left, right = args.right, participantType = "virtualParticipant"]
                `,
                {
                    docs: "Creates a virtual participant that is not visible in the diagram but can be used for things that need to differentiate between a 'left' and a 'right' position",
                    params: [
                        ["left", "a function producing the left point of this participant", functionType],
                        ["right", "a function producing the right point of this participant", functionType],
                        ["x", "the index of this participant", numberType]
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

                    while {participant.activeActivityIndicators.length > 0 } {
                        scope.deactivate(participant)
                    }

                    scope.internal.sequenceDiagramParticipants = scope.internal.sequenceDiagramParticipants.filter({
                        (storedParticipant) = args
                        participant != storedParticipant 
                    })
                    
                    participant.alive = false

                    originalArgs = args
                    at = args.at
                    after = args.after
                    priority = 3
                    
                    currentPos = scope.internal.calculatePosition(at = at, after = after, priority = priority)
                    scope.internal.updateSequenceDiagramPosition(currentPos)
                    
                    if(participant.declaringPos != currentPos) {
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

                        cross.pos = scope.rpos(participant.referencePos, 0, currentPos)
                        cross.pos.edits["${DefaultEditTypes.MOVE_Y}"] = createAdditiveEdit(at ?? after, "dy")
                        scope.internal.registerCanvasElement(cross, originalArgs, originalArgs.self)

                        participant.lifeline.contents.get(participant.lifeline.contents.length - 1).end = cross.pos

                        cross
                    }
                `,
                {
                    docs: "Destroys a participant at a calculated position",
                    params: [
                        [0, "the participant to destroy", participantType],
                        [
                            "at",
                            "the absolute y position where to destroy. If set, takes priority over 'after'",
                            optional(numberType)
                        ],
                        [
                            "after",
                            "the relative y offset from the current position. Only used if 'at' is not set",
                            optional(numberType)
                        ],
                        [
                            "crossSize",
                            "the size of the cross to draw. Defaults to 'destroyingCrossSize'",
                            optional(numberType)
                        ]
                    ],
                    snippet: "($1)",
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
                cls("lifeline-connection") {
                    strokeDash = 6
                    strokeDashSpace = 2
                }
            }
        `
    ]
);
