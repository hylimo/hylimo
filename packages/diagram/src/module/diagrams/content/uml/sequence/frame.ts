import { booleanType, fun, id, InterpreterModule, optional, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { eventCoordinateType } from "./types.js";

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
          scope.internal.createSequenceDiagramFragment = {
            (topLineEvent) = args
            if(topLineEvent == null) {
                scope.error("No event (coordinate) was passed to 'fragment'")
            }
            
            // Best effort guess to see if the given event is either an event or an event coordinate
            if((topLineEvent.name == null) && (topLineEvent.participantName == null) || (topLineEvent.y.proto != 1.proto)) {
                scope.error("The event passed to 'fragment' is neither an event nor an event coordinate")
            }
            
            parentLeftX = args.parentLeftXCoordinate
            parentRightX = args.parentRightXCoordinate
            y = topLineEvent.y
            width = parentRightX - parentLeftX
            
            // TODO: Finish from here on
            separatingLineElement = canvasElement(content = path())
            
            
          }
        
          scope.internal.createSequenceDiagramFrame = {
            // First, explicitly declare and initialize all parameters
            if(args.args == null) {
              scope.error("createSequenceDiagramFrame is missing its 'args = args' parameter")
            }
            args = args.args
            
            (fragmentFunction) = args
            fragmentFunction = fragmentFunction ?? {}

            // We must differentiate four different version to set margin:
            // 1. No margin set -> use scope.frameMarginX/Y
            // 2. Everything has the same margin -> use args.margin
            // 3. x and y have the same margin respectively (top-bottom, left-right)
            // 4. Everything has an individual margin
            defaultMarginX = args.marginX
            if(defaultMarginX == null) {
              defaultMarginX = scope.frameMarginX
            }
            defaultMarginY = args.marginY
            if(defaultMarginY == null) {
              defaultMarginY = scope.frameMarginY
            }
            topLeft = args.topLeft
            bottomRight = args.bottomRight
            
            marginRight = args.marginRight ?? defaultMarginX
            marginBottom = args.marginBottom ?? defaultMarginY
            marginLeft = args.marginLeft ?? defaultMarginX
            marginTop = args.marginTop ?? defaultMarginY
            
            // Calculate the rectangle position
            x = topLeft.x - marginLeft
            y = topLeft.y - marginTop
            width = bottomRight.x - topLeft.x + marginLeft + marginRight
            height = bottomRight.y - topLeft.y + marginTop + marginBottom
            
            // Add the frame
            frameElement = canvasElement(
                    content = rect(class = list("frame")),
                    class = list("frame-element"),
                    width = width,
                    height = height
                )
            frameElement.pos = scope.apos(x, y)
 
            scope.internal.registerCanvasElement(frameElement, args, args.self)
            frameElement
          }
        `,
        id(SCOPE).assignField(
            "frame",
            fun(
                `
              scope.internal.createSequenceDiagramFrame(args = args)
            `,
                {
                    docs: "Creates a frame around two endpoints",
                    params: [
                        ["text", "The text to display in the upper-left corner", optional(stringType)],
                        [
                            "subtext",
                            "The text to display right of the main text, i.e. a condition for an if or while",
                            optional(stringType)
                        ],
                        [
                            "hasIcon",
                            "Whether to draw the UML border around the text. If false, only the outer boundary will be drawn",
                            optional(booleanType)
                        ],
                        [
                            "topLeft",
                            "The top-left coordinate (event) to draw the border around. The border will be extended by 'frameMargin' on each side",
                            eventCoordinateType
                        ],
                        [
                            "bottomRight",
                            "The bottom-right coordinate (event) to draw the border around. The border will be extended by 'frameMargin' on each side",
                            eventCoordinateType
                        ]
                    ],
                    snippet: `(topLeft = $1, bottomRight = $1)`,
                    returns: "The created frame"
                }
            )
        )
    ]
);
