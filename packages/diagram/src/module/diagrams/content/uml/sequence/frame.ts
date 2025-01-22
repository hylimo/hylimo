import {
    booleanType,
    fun,
    functionType,
    id,
    InterpreterModule,
    numberType,
    optional,
    or,
    stringType
} from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { eventType, participantType } from "./types.js";

const fragmentNameBorderSVG = "M 0 0 H 20 V 5 L 16 9 H 0 V 0";

/**
 * Defines a frame.<br>
 * A frame is
 * - a rectangle delimiting it
 * - optional text (i.e. `if`) (optionally inside a small icon) in the top-left corner
 * - optional subtext next to the text (i.e. the condition for the `if`)
 */
export const sequenceDiagramFrameModule = InterpreterModule.create(
    "uml/sequence/frame",
    ["uml/sequence/defaultValues"],
    [],
    [
        `
            this.createSequenceDiagramFragment = {
                parentArgs = parentArgs ?? args.parentArgs
                (topLineEvent) = args
                if(topLineEvent == null) {
                    scope.error("No event/y coordinate was passed to 'fragment'")
                }

                parent = parent ?? args.parent
                parentLeftX = parent.x
                parentRightX = parentLeftX + parent.width
                width = parentRightX - parentLeftX
                x = parentLeftX
                y = if(topLineEvent.proto == 1.proto) { topLineEvent } { topLineEvent.y }

                // The frame is offset by 'margin' from the event, but we want to connect the name to the frame border/fragment line
                marginTop = marginTop ?? args.marginTop
                y = y - marginTop

                fragmentText = args.text
                fragmentSubtext = args.subtext
                hasLine = args.hasLine
                hasIcon = args.hasIcon ?? (fragmentText != null)

                fragment = [text = fragmentText, subtext = fragmentSubtext, hasIcon = hasIcon, hasLine = hasLine, topY = y]

                // Draw the line on top of the fragment
                if(args.hasLine) {
                    separatingLine = scope[".."](scope.apos(x, y), scope.apos(x + width, y))
                    fragment.line = separatingLine
                }

                // Calculate the auxilliary parts of the fragment - first the 'name' and its border in the upper left corner
                borderElement = null
                nameElement = null

                if(hasIcon) {
                    borderElement = path(path = "${fragmentNameBorderSVG}", class = list("fragment-name-border"))
                }

                if(fragmentText != null) {
                    nameElement = text(contents = list(span(text = fragmentText)), class = list("fragment-name"))
                }

                // Case 1: Both name and border are present
                if((borderElement != null) && (nameElement != null)) {
                    name = canvasElement(
                        content = stack(contents = list(borderElement, nameElement)),
                        class = list("fragment-name-element")
                    )
                    name.pos = scope.apos(x, y)
                    scope.internal.registerCanvasElement(name, parentArgs, parentArgs.self)
                    fragment.nameElement = name
                } {

                    // Case 2: Only border is present
                    if(borderElement != null) {
                        border = canvasElement(
                            content = borderElement,
                            class = list("fragment-name-element")
                        )
                        border.pos = scope.apos(x, y)
                        border.width = 20
                        border.height = 10
                        scope.internal.registerCanvasElement(border, parentArgs, parentArgs.self)
                        fragment.nameElement = border
                    }

                    // Case 3: Only name is present
                    if(nameElement != null) {
                        name = canvasElement(
                            content = nameElement,
                            class = list("fragment-name-element")
                        )
                        name.pos = scope.apos(x, y)
                        scope.internal.registerCanvasElement(name, parentArgs, parentArgs.self)
                        fragment.nameElement = name
                    }
                }

                // And lastly, the subtext if present
                if(fragmentSubtext != null) {
                    label = canvasElement(content = text(contents = list(span(text = fragmentSubtext)), class = list("fragment-subtext")), class = list("fragment-subtext-element"))
                    if(fragment.nameElement != null) {
                        // For some reason, the rpos without lpos means relative to the left instead of the right side  
                        label.pos = scope.rpos(scope.lpos(fragment.nameElement, 0.90), 20, 0)
                    } {
                        // Hardcode the position a little bit below to the right of the top-left corner if no text is present
                        // Don't interfere with the default left frame margin (20) for visually better results
                        label.pos = scope.apos(x + 25, y + 5)
                    }
                    fragment.subtextElement = label
                    scope.internal.registerCanvasElement(label, parentArgs, parentArgs.self)
                }

                parent.fragments += fragment

                scope.styles {
                    cls("fragment-name") {
                        marginLeft = 5
                        marginRight = 7
                        marginTop = 2
                        marginBottom = 2
                    }
                    cls("fragment-name-border") {
                        fill = var("background")
                    }
                    cls("fragment-subtext") {
                        marginTop = 2
                        marginBottom = 2
                    }
                }

                fragment
              }
            `,
        id(SCOPE).assignField(
            "frame",
            fun(
                [
                    `
                        argsCopy = args

                        (fragmentFunction) = args
                        fragmentFunction = fragmentFunction ?? {}

                        frameText = args.text
                        hasIcon = args.hasIcon ?? (frameText != null)
                        subtext = args.subtext

                        // We must differentiate the following approaches to set margin:
                        // 1. No margin set -> use scope.frameMarginX/Y
                        // 2. Everything has an individual margin
                        defaultMarginX = args.marginX
                        if(defaultMarginX == null) {
                            defaultMarginX = scope.frameMarginX
                        }
                        defaultMarginY = args.marginY
                        if(defaultMarginY == null) {
                            defaultMarginY = scope.frameMarginY
                        }

                        marginRight = args.marginRight ?? defaultMarginX
                        marginBottom = args.marginBottom ?? defaultMarginY
                        marginLeft = args.marginLeft ?? defaultMarginX
                        marginTop = args.marginTop ?? defaultMarginY

                        top = args.top
                        right = args.right
                        bottom = args.bottom
                        left = args.left

                        // We must swap around the coordinates if necessary - this case can happen when the user moves a participant and is otherwise only fixable by manually adjusting the bounds
                        if(left.x > right.x) {
                            temp = left
                            left = right
                            right = temp
                        }
                        // We do NOT switch around 'top' and 'bottom': The case "user moves participants around" is common, the case "top and bottom events are switched" is really uncommon. In that case, the user will already have to fix everything

                        // Calculate the rectangle position
                        x = left.x - marginLeft
                        y = top.y - marginTop
                        width = right.x - left.x + marginLeft + marginRight
                        height = bottom.y - top.y + marginTop + marginBottom


                        // Add the frame
                        frameElement = canvasElement(
                            content = rect(class = list("frame")),
                            class = list("frame-element"),
                            width = width,
                            height = height
                        )
                        frameElement.top = top
                        frameElement.right = right
                        frameElement.bottom = bottom
                        frameElement.left = left
                        frameElement.fragments = list()
                        frameElement.text = text
                        frameElement.hasIcon = icon
                        frameElement.subtext = subtext

                        frameElement.pos = scope.apos(x, y)
                        frameElement.x = x
                        frameElement.y = y
                        frameElement.width = width
                        frameElement.height = height

                        scope.internal.registerCanvasElement(frameElement, args, args.self)

                        // Lastly, generate all fragments for the given frame, including the implicit top fragment
                        createSequenceDiagramFragment(top, marginTop = marginTop, parentArgs = args, parent = frameElement, hasIcon = hasIcon, hasLine = false, text = frameText, subtext = subtext)
                    `,
                    id("this").assignField(
                        "sequenceDiagramFragmentFunction",
                        fun(
                            `createSequenceDiagramFragment(it, marginTop = marginTop, parentArgs = argsCopy, parent = frameElement, hasIcon = args.hasIcon, hasLine = args.hasLine ?? true, text = args.text, subtext = args.subtext)`,
                            {
                                docs: "Creates a new fragment inside this frame. A fragment is a separate section within the frame, optionally with name and subtext",
                                params: [
                                    [
                                        0,
                                        "The y coordinate where to start the the fragment. Either an event, or a number",
                                        or(eventType, numberType)
                                    ],
                                    ["text", "The text to display in the upper-left corner", optional(stringType)],
                                    [
                                        "subtext",
                                        "The text to display right of the main text, i.e. a condition for an else if",
                                        optional(stringType)
                                    ],
                                    [
                                        "hasIcon",
                                        "Whether to draw the border around the text. If false, only the outer boundary will be drawn. Will be shown by default when the frame should have text",
                                        optional(booleanType)
                                    ],
                                    [
                                        "hasLine",
                                        "Whether to draw the line on top of the fragment. 'true' by default",
                                        optional(booleanType)
                                    ]
                                ],
                                snippet: `($1, text = "$2", subtext = "$3")`,
                                returns: "The created fragment"
                            }
                        )
                    ),
                    `
                        fragmentFunction.callWithScope([fragment = sequenceDiagramFragmentFunction, parentArgs = argsCopy, parent = frameElement])
                        frameElement
                    `
                ],
                {
                    docs: "Creates a frame around two endpoints",
                    params: [
                        [
                            0,
                            "A function generating all fragments (additional compartments within the frame)",
                            optional(functionType)
                        ],
                        ["text", "The text to display in the upper-left corner", optional(stringType)],
                        [
                            "subtext",
                            "The text to display right of the main text, i.e. a condition for an if or while",
                            optional(stringType)
                        ],
                        [
                            "hasIcon",
                            "Whether to draw the UML border around the text. If false, only the outer boundary will be drawn. Will be shown by default when the frame should have text",
                            optional(booleanType)
                        ],
                        [
                            "top",
                            "The event marking the upper border of the frame. The border will be extended by 'frameMarginY' to the top",
                            eventType
                        ],
                        [
                            "right",
                            "The participant marking the left border of the frame. The border will be extended by 'frameMarginX' to the right",
                            participantType
                        ],
                        [
                            "bottom",
                            "The event marking the bottom border of the frame. The border will be extended by 'frameMarginY' to the bottom",
                            eventType
                        ],
                        [
                            "left",
                            "The participant marking the left border of the frame. The border will be extended by 'frameMarginX' to the left",
                            participantType
                        ],
                        [
                            "marginX",
                            "How much margin to use both left and right. Defaults to 'frameMarginX'",
                            optional(numberType)
                        ],
                        [
                            "marginY",
                            "How much margin to use both on the top and bottom. Defaults to 'frameMarginX'",
                            optional(numberType)
                        ],
                        [
                            "marginLeft",
                            "How much margin to use on the left. Defaults to 'marginX'",
                            optional(numberType)
                        ],
                        ["marginTop", "How much margin to use on the top. Defaults to 'marginY'", optional(numberType)],
                        [
                            "marginRight",
                            "How much margin to use on the right. Defaults to 'marginX'",
                            optional(numberType)
                        ],
                        [
                            "marginBottom",
                            "How much margin to use on the bottom. Defaults to 'marginY'",
                            optional(numberType)
                        ]
                    ],
                    snippet: `(top = $1, right = $2, bottom = $3, left = $4, text = "$5", subtext = "$6")`,
                    returns: "The created frame"
                }
            )
        )
    ]
);
