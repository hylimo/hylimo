import { fun, functionType, id, numberType, optional, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { participantType } from "./types.js";
import { ContentModule } from "../../contentModule.js";
import { DefaultEditTypes } from "@hylimo/diagram-common";

/**
 * Defines a frame.
 *
 * A frame is
 * - a rectangle delimiting it
 * - optional text (i.e. `if`) (optionally inside a small icon) in the top-left corner
 * - optional subtext next to the text (i.e. the condition for the `if`)
 */
export const sequenceDiagramFrameModule = ContentModule.create(
    "uml/sequence/frame",
    ["uml/sequence/defaultValues", "uml/sequence/diagramState"],
    [],
    [
        `
            this.createSequenceDiagramFragment = {
                (fragmentOffset) = args
                this.parent = args.parent
                this.parentArgs = args.parentArgs
                this.fragmentSubtext = args.subtext
                this.hasLine = args.hasLine
                this.labelMargin = args.labelMargin
                this.labelMarginWithDefault = labelMargin ?? scope.internal.config.frameSubtextMargin
                this.labelReferencePos = args.labelReferencePos

                this.fragment = [subtext = fragmentSubtext, hasLine = hasLine]

                if(args.hasLine) {
                    this.lineStartPos = scope.rpos(parent.topLeftPos, 0, fragmentOffset)
                    this.lineEndPos = scope.rpos(parent.topRightPos, lineStartPos)
                    
                    separatingLine = scope.internal.createConnection(
                        lineStartPos,
                        lineEndPos,
                        list("fragment-line"),
                        null,
                        scope,
                        lineType = "line"
                    )
                    fragment.line = separatingLine
                }

                if(fragmentSubtext != null) {
                    label = canvasElement(
                        contents = list(text(contents = list(span(text = fragmentSubtext)), class = list("fragment-subtext"))),
                        class = list("fragment-subtext-element")
                    )
                    
                    label.pos = scope.rpos(labelReferencePos, labelMarginWithDefault, fragmentOffset)
                    
                    label.pos.edits["${DefaultEditTypes.MOVE_X}"] = createAdditiveEdit(
                        labelMargin,
                        if (labelMargin != null) { "dx" } { "(\${scope.internal.config.frameSubtextMargin} + dx)" }
                    )
                    fragment.subtextElement = label
                    scope.internal.registerCanvasElement(label, parentArgs, parentArgs.self)
                }

                fragment
            }
        `,
        id(SCOPE).assignField(
            "frame",
            fun(
                [
                    `
                        (frameText, fragmentFunction) = args

                        this.argsCopy = args
                        this.fragmentFunction = fragmentFunction ?? {}

                        this.subtext = args.subtext

                        this.at = args.at
                        this.after = args.after
                        
                        this.position = scope.internal.calculatePosition(at = at, after = after, priority = 3)
                        scope.internal.updateSequenceDiagramPosition(position)

                        this.marginRight = args.marginRight
                        this.marginLeft = args.marginLeft
                        this.marginBottom = args.marginBottom
                        this.subtextMargin = args.subtextMargin

                        this.right = args.right
                        this.left = args.left

                        if ((left != null) && (right != null)) {
                            if(left.x > right.x) {
                                this.temp = left
                                left = right
                                right = temp
                            }
                        }
                        
                        // Create a placeholder frame element to pass to fragments
                        this.frameElement = []
                        frameElement.position = position
                        this.dummyPos = scope.apos()
                        this.topLeftPos = scope.rpos(dummyPos)
                        this.topRightPos = scope.rpos(dummyPos)
                        this.fragments = list()

                        this.nameElement = canvasElement(
                            contents = list(container(contents = list(
                                path(path = "M 0 0 H 20 V 5 L 16 9 H 0 Z", class = list("fragment-name-background")),
                                path(path = "M 20 0 V 5 L 16 9 H 0", class = list("fragment-name-border")),
                                text(contents = list(span(text = frameText)), class = list("fragment-name"))
                            ))),
                            class = list("fragment-name-element")
                        )
                        nameElement.pos = topLeftPos
                        scope.internal.registerCanvasElement(nameElement, args, args.self)

                        this.topMiddlePos = scope.rpos(scope.lpos(nameElement, 0.875), topLeftPos)

                        this.leftOffset = 0
                        this.rightOffset = 0
                        this.leftLocked = args.left != null
                        this.rightLocked = args.right != null
                        
                        frameElement.registerIncluded = {
                            (participant, leftOff, rightOff) = args

                            if(!(leftLocked) && ((left == null) || (participant.x < left.x))) {
                                left = participant
                                leftOffset = leftOff 
                            }
                            if(!(rightLocked) && ((right == null) || (participant.x > right.x))) {
                                right = participant
                                rightOffset = rightOff
                            }
                            if ((participant.x == left.x) && (leftOff > leftOffset)) {
                                leftOffset = leftOff
                            }
                            if ((participant.x == right.x) && (rightOff > rightOffset)) {
                                rightOffset = rightOff
                            }
                        }

                        if(fragmentFunction != null) {
                            scope.internal.registerTargetPosition(scope.internal.config.frameMarginTop, 0)
                            scope.internal.activeFrames += frameElement
                        }

                        frameElement.topLeftPos = topLeftPos
                        frameElement.topRightPos = topRightPos
                    `,
                    id("this").assignField(
                        "sequenceDiagramFragmentFunction",
                        fun(
                            `
                                (subtext) = args
                                
                                this.at = args.at
                                this.after = args.after
                                this.subtextMargin = args.subtextMargin
                                
                                this.fragmentPosition = scope.internal.calculatePosition(at = at, after = after, priority = 3)
                                scope.internal.updateSequenceDiagramPosition(fragmentPosition)
                                scope.internal.registerTargetPosition(scope.internal.config.fragmentMargin, 0)
                                
                                this.fragment = createSequenceDiagramFragment(
                                    fragmentPosition - position,
                                    parentArgs = argsCopy,
                                    parent = frameElement,
                                    hasLine = true,
                                    subtext = subtext,
                                    labelMargin = subtextMargin,
                                    labelReferencePos = topMiddlePos
                                )
                                fragment.line.start.edits["${DefaultEditTypes.MOVE_Y}"] = createAdditiveEdit(at ?? after, "dy")
                                fragment
                            `,
                            {
                                docs: "Creates a new fragment inside this frame. A fragment is a separate section within the frame, optionally with name and subtext",
                                params: [
                                    [
                                        0,
                                        "The text to display right of the main text, i.e. a condition for an else if",
                                        optional(stringType)
                                    ],
                                    [
                                        "at",
                                        "the absolute y position where to start the fragment. If set, takes priority over 'after'",
                                        optional(numberType)
                                    ],
                                    [
                                        "after",
                                        "the relative y offset from the current position. Only used if 'at' is not set",
                                        optional(numberType)
                                    ],
                                    [
                                        "subtextMargin",
                                        "the horizontal margin for the subtext label. Defaults to the config 'frameSubtextMargin'",
                                        optional(numberType)
                                    ]
                                ],
                                snippet: `("$1")`,
                                returns: "The created fragment"
                            }
                        )
                    ),
                    `
                        createSequenceDiagramFragment(
                            0,
                            parentArgs = args,
                            parent = frameElement,
                            hasLine = false,
                            text = frameText,
                            subtext = subtext,
                            labelMargin = subtextMargin,
                            labelReferencePos = topMiddlePos
                        )
                        
                        if (fragmentFunction != null) {
                            fragmentFunction.callWithScope([fragment = sequenceDiagramFragmentFunction, parentArgs = argsCopy, parent = frameElement])
                            scope.internal.activeFrames = scope.internal.activeFrames.filter { it != frameElement }
                        }

                        if((left == null) || (right == null)) {
                            if(fragmentFunction == null) {
                                scope.error("left and right must be provided if no callback is given")
                            } {
                                scope.error("Could not determine left and/or right participant for frame. Please specify them manually.")
                            }
                        }
                        
                        this.bottomPosition = scope.internal.calculatePosition(priority = 3) + (marginBottom ?? scope.internal.config.frameMarginBottom)
                        
                        this.bottomLeftPos = scope.rpos(topLeftPos, 0, bottomPosition - position)
                        this.bottomRightPos = scope.rpos(topRightPos, bottomLeftPos)

                        leftOffset = Math.max(-(scope.internal.findParticipantLeftRightPosition(left, position, "left")), leftOffset)
                        rightOffset = Math.max(scope.internal.findParticipantLeftRightPosition(right, position, "right"), rightOffset)

                        this.leftDistance = (marginLeft ?? scope.internal.config.frameMarginX) + leftOffset
                        this.rightDistance = (marginRight ?? scope.internal.config.frameMarginX) + rightOffset
                        scope.internal.registerFrameInclusion(left, leftDistance, 0)
                        scope.internal.registerFrameInclusion(right, 0, rightDistance)

                        topLeftPos.targetX = left.referencePos
                        topLeftPos.targetY = left.referencePos
                        topLeftPos.offsetX = -(leftDistance)
                        topLeftPos.offsetY = position
                        
                        topRightPos.targetX = right.referencePos
                        topRightPos.targetY = topLeftPos
                        topRightPos.offsetX = rightDistance

                        topLeftPos.edits["${DefaultEditTypes.MOVE_X}"] = createAdditiveEdit(
                            marginLeft,
                            if (marginLeft != null) { "-dx" } { "(\${scope.internal.config.frameMarginX} - dx)" }
                        )
                        topLeftPos.edits["${DefaultEditTypes.MOVE_Y}"] = createAdditiveEdit(at ?? after, "dy")
                        topRightPos.edits["${DefaultEditTypes.MOVE_X}"] = createAdditiveEdit(
                            marginRight,
                            if (marginRight != null) { "dx" } { "(dx + \${scope.internal.config.frameMarginX})" }
                        )
                        bottomLeftPos.edits["${DefaultEditTypes.MOVE_Y}"] = createAdditiveEdit(
                            marginBottom,
                            if (marginBottom != null) { "dy" } { "(dy + \${scope.internal.config.frameMarginBottom})" }
                        )
                        
                        this.frameBorder = scope.internal.createConnection(
                            topMiddlePos,
                            topMiddlePos,
                            list("frame-border"),
                            args,
                            args.self,
                            lineType = "line"
                        )
                        frameBorder.contents = list()
                        frameBorder.contents.add(canvasLineSegment(end = topRightPos))
                        frameBorder.contents.add(canvasLineSegment(end = bottomRightPos))
                        frameBorder.contents.add(canvasLineSegment(end = bottomLeftPos))
                        frameBorder.contents.add(canvasLineSegment(end = topLeftPos))
                        frameBorder.contents.add(canvasLineSegment(end = topMiddlePos))
                        
                        scope.internal.updateSequenceDiagramPosition(bottomPosition)
                        scope.internal.registerTargetPosition(scope.internal.config.frameMargin, 0)
                        
                        frameElement
                    `
                ],
                {
                    docs: "Creates a frame. If a callback function is provided, it will be executed and the frame's bottom will be set to the current position after execution. Otherwise, you must specify bottomAt or bottomAfter.",
                    params: [
                        [0, "The text to display in the upper-left corner", stringType],
                        [
                            1,
                            "A function generating all fragments (additional compartments within the frame)",
                            optional(functionType)
                        ],
                        [
                            "subtext",
                            "The text to display right of the main text, i.e. a condition for an if or while",
                            optional(stringType)
                        ],
                        [
                            "at",
                            "The absolute y position marking the upper border of the frame. If set, takes priority over 'after'",
                            optional(numberType)
                        ],
                        [
                            "after",
                            "The relative y offset from the current position for the top border. Only used if 'at' is not set",
                            optional(numberType)
                        ],
                        [
                            "right",
                            "The participant marking the right border of the frame. The border will be extended by 'marginRight' to the right. Optional if a callback is provided",
                            optional(participantType)
                        ],
                        [
                            "left",
                            "The participant marking the left border of the frame. The border will be extended by 'marginLeft' to the left. Optional if a callback is provided",
                            optional(participantType)
                        ],
                        [
                            "marginLeft",
                            "How much margin to use on the left. Defaults to the config 'frameMarginX'",
                            optional(numberType)
                        ],
                        [
                            "marginRight",
                            "How much margin to use on the right. Defaults to the config 'frameMarginX'",
                            optional(numberType)
                        ],
                        [
                            "marginBottom",
                            "How much margin to use on the bottom. Defaults to the config 'frameMarginBottom'",
                            optional(numberType)
                        ],
                        [
                            "subtextMargin",
                            "the horizontal margin for the subtext label. Defaults to the config 'frameSubtextMargin'",
                            optional(numberType)
                        ]
                    ],
                    snippet: `("$1", right = $2, left = $3) {\n    $4\n}`,
                    returns: "The created frame"
                }
            )
        ),
        `
            scope.styles {
                cls("fragment-name") {
                    marginLeft = 5
                    marginRight = 7
                    marginTop = 2
                    marginBottom = 2
                }
                cls("fragment-name-background") {
                    fill = var("background")
                    strokeOpacity = 0
                }
                cls("fragment-subtext") {
                    marginTop = 2
                    marginBottom = 2
                }
                cls("fragment-line") {
                    strokeDash = 6
                    strokeDashSpace = 2
                }
            }
        `
    ]
);
