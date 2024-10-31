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
        id(SCOPE).assignField(
            "frame",
            fun(``, {
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
                        "start",
                        "The top-left coordinate (event) to draw the border around. The border will be extended by 'frameMargin' on each side",
                        eventCoordinateType
                    ],
                    [
                        "end",
                        "The bottom-right coordinate (event) to draw the border around. The border will be extended by 'frameMargin' on each side",
                        eventCoordinateType
                    ]
                ],
                snippet: `($1)`,
                returns: "The created frame"
            })
        )
    ]
);
