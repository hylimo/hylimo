import { fun, id, object, optional, str, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";

/**
 * Module providing the nodes which start and terminate a flow:
 * the initial node (`start`), the activity final node (`stop`) and the flow final node (`end`)
 */
export const initialAndFinalModule = ContentModule.create(
    "uml/activity/initialAndFinal",
    ["uml/classifier/classifier", "uml/activity/activityNode"],
    [],
    [
        `
            _start = scope.internal.createActivityNode("start", scope.defaultShapes.circle, list())
            _stop = scope.internal.createActivityNode(
                "stop",
                scope.defaultShapes.circle,
                list(
                    [
                        { },
                        {
                            args.contents += shape(
                                shape = scope.defaultShapes.circle,
                                class = list("stop-inner")
                            )
                        }
                    ]
                )
            )
            // the cross is a decoration of the circle instead of a separate element, so that it is
            // expressed in the box of the shape and therefore scales with the node when it is resized.
            // Its ends are the corners of the square inside the circle, which land exactly on it
            _end = scope.internal.createActivityNode(
                "end",
                [
                    path = scope.defaultShapes.circle.path,
                    decoration = "M 0.14644661w,0.14644661h L 0.85355339w,0.85355339h "
                        + "M 0.85355339w,0.14644661h L 0.14644661w,0.85355339h"
                ],
                list()
            )

            _createTerminalNode = {
                (nodeFunction, name, terminalArgs) = args
                this.node = nodeFunction(name, null, args = terminalArgs)
                node.class += "terminal-element"
                node
            }
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("start"),
                fun(
                    `
                        (name) = args
                        _createTerminalNode(_start, name, args)
                    `,
                    {
                        docs: "Creates an initial node, the filled circle a flow starts at.",
                        params: [
                            [
                                0,
                                "the optional name under which the node is registered in the diagram scope, not rendered",
                                optional(stringType)
                            ]
                        ],
                        snippet: `()`,
                        returns: "The created initial node"
                    }
                ),
                object([
                    {
                        name: "Start/Start",
                        value: str("start()")
                    }
                ])
            ),
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("stop"),
                fun(
                    `
                        (name) = args
                        _createTerminalNode(_stop, name, args)
                    `,
                    {
                        docs: "Creates an activity final node, the filled circle in a ring which terminates the whole activity.",
                        params: [
                            [
                                0,
                                "the optional name under which the node is registered in the diagram scope, not rendered",
                                optional(stringType)
                            ]
                        ],
                        snippet: `()`,
                        returns: "The created activity final node"
                    }
                ),
                object([
                    {
                        name: "Start/Stop",
                        value: str("stop()")
                    }
                ])
            ),
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("end"),
                fun(
                    `
                        (name) = args
                        _createTerminalNode(_end, name, args)
                    `,
                    {
                        docs: "Creates a flow final node, the circle with a cross which terminates only the flow reaching it.",
                        params: [
                            [
                                0,
                                "the optional name under which the node is registered in the diagram scope, not rendered",
                                optional(stringType)
                            ]
                        ],
                        snippet: `()`,
                        returns: "The created flow final node"
                    }
                ),
                object([
                    {
                        name: "Start/End",
                        value: str("end()")
                    }
                ])
            ),
        `
            scope.styles {
                vars {
                    terminalNodeSize = 30
                }
                cls("terminal-element") {
                    // the size is provided as the bounds, not as the width and height: it pins the node
                    // to exactly that size just the same, but leaves width and height free for the resize
                    // edit of the element, which overrules the bounds
                    minWidth = var("terminalNodeSize")
                    minHeight = var("terminalNodeSize")
                    maxWidth = var("terminalNodeSize")
                    maxHeight = var("terminalNodeSize")

                    cls("activity-node-container") {
                        margin = 0
                    }
                }
                cls("start") {
                    fill = var("primary")
                    stroke = unset
                }
                cls("stop-element") {
                    // the inner circle gets no size of its own, it fills the content box of the outer
                    // circle, which is what makes it scale with the node when it is resized. Filling
                    // requires a stack, as a vbox only stretches its contents horizontally
                    cls("activity-node-container") {
                        layout = "stack"
                        hAlign = unset
                        vAlign = unset
                    }
                }
                cls("stop-inner") {
                    fill = var("primary")
                    stroke = unset
                }
            }
        `
    ]
);
