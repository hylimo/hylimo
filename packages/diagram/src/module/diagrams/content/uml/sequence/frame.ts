import { booleanType, fun, functionType, id, InterpreterModule, optional, or, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { eventCoordinateType, participantType } from "./types.js";

const operatorRectangleSVG = "M 0 0 H 20 V 5 L 16 9 H 0 V 0";

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
            
            parentFrame = args.parentFrame
            
            // Best effort guess to see if the given event is either an event or an event coordinate
            if((topLineEvent.name == null) && (topLineEvent.participantName == null) || (topLineEvent.y.proto != 1.proto)) {
              scope.error("The event passed to 'fragment' is neither an event nor an event coordinate")
            }
            
            parentLeftX = args.parentLeftXCoordinate
            parentRightX = args.parentRightXCoordinate
            y = topLineEvent.y
            width = parentRightX - parentLeftX
            
            // TODO: Finish from here on
            separatingLine = canvasElement(
              content = path(path = "H 1", class = list("fragment-line")),
              class = list("fragment-line-element"))
            separatingLine.pos = scope.apos()

            scope.internal.registerCanvasElement(frameElement, args, args.self)
            
            
          }
        
          scope.internal.createSequenceDiagramFrame = {
            // First, explicitly declare and initialize all parameters
            if(args.args == null) {
              scope.error("createSequenceDiagramFrame is missing its 'args = args' parameter")
            }
            args = args.args
            argsCopy = args
            
            (fragmentFunction) = args
            fragmentFunction = fragmentFunction ?? {}
            
            text = args.text
            hasIcon = args.hasIcon ?? (text != null)
            subtext = args.subtext

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
            frameElement.topLeft = topLeft
            frameElement.bottomRight = bottomRight
            frameElement.fragments = list()
            frameElement.text = text
            frameElement.hasIcon = icon
            frameElement.subtext = subtext
 
            frameElement.pos = scope.apos(x, y)
 
            scope.internal.registerCanvasElement(frameElement, args, args.self)
 
            // Calculate the auxilliary parts of the frame - first the 'nearly' rectangle in the upper left corner
            if(hasIcon) {
              operatorRectangleElement = canvasElement(content = 
                path(path = "${operatorRectangleSVG}", class = list("operator-rectangle")),
                class = list("operator-rectangle-element"))
              upperLeftCornerElement.pos = scope.apos(x, y)
              scope.internal.registerCanvasElement(operatorRectangleElement, argsCopy, argsCopy.self)
            }
            
            scope.styles {
              cls("operator-rectangle") {
                
              }
            }
            
            // Then the frame text
            if(text != null) {
            }
            
            // And the subtext if present
            if(subtext != null) {
            } 
            
            // Lastly, generate all fragments for the given frame
            fragmentFunction.callWithScope([parent = frameElement, fragment = scope.internal.createSequenceDiagramFragment ])
            
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
                            "topLeft",
                            "The top-left coordinate (event) to draw the border around. The border will be extended by 'frameMargin' on each side",
                            or(eventCoordinateType, participantType)
                        ],
                        [
                            "bottomRight",
                            "The bottom-right coordinate (event) to draw the border around. The border will be extended by 'frameMargin' on each side",
                            or(eventCoordinateType, participantType)
                        ]
                    ],
                    snippet: `(topLeft = $1, bottomRight = $1)`,
                    returns: "The created frame"
                }
            )
        )
    ]
);
