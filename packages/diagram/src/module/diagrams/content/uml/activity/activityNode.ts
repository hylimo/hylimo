import { fun, id } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";

/**
 * Module providing the helper function used to create activity diagram nodes.
 *
 * In contrast to a classifier, an activity node has no compartments: it is a single parametric shape
 * with its (optional) label centered inside. The node type only determines the shape and the styles,
 * everything else is contributed by content handlers, using the same two-phase protocol as
 * {@link classifierModule}.
 */
export const activityNodeModule = ContentModule.create(
    "uml/activity/activityNode",
    ["common/defaultShapes"],
    ["uml/keywords"],
    [
        id(SCOPE)
            .field("internal")
            .assignField(
                "createActivityNode",
                fun(
                    `
                        (type, nodeShape, contentHandlers) = args
                        {
                            nodeArgs = args
                            canvasScope = nodeArgs.args.self
                            (name, optionalCallback) = args
                            callback = optionalCallback ?? {}
                            result = []

                            nodeContents = list()
                            renderedNode = shape(
                                shape = nodeShape,
                                class = list("activity-node", type),
                                contents = list(
                                    container(contents = nodeContents, class = list("activity-node-container"))
                                )
                            )
                            nodeElement = canvasElement(
                                contents = list(renderedNode),
                                class = list("activity-node-element", type + "-element")
                            )
                            contentHandlers.forEach {
                                it[0](
                                    callScope = result,
                                    args = nodeArgs,
                                    element = nodeElement,
                                    contents = nodeContents,
                                    canvasScope = canvasScope
                                )
                            }

                            scope.internal.registerCanvasElement(
                                nodeElement,
                                nodeArgs.args,
                                canvasScope
                            )
                            if(isString(name)) {
                                scope.internal.registerInDiagramScope(name, nodeElement)
                            }

                            callback.callWithScope(result)

                            contentHandlers.forEach {
                                it[1](
                                    callScope = result,
                                    args = nodeArgs,
                                    element = nodeElement,
                                    contents = nodeContents,
                                    canvasScope = canvasScope
                                )
                            }

                            nodeElement
                        }
                    `,
                    {
                        docs: `
                            Creates a function that creates an activity node, e.g. an action or a decision node.
                            The resulting function always takes one or two positional arguments:
                            The name of the node, and a function that is immediately called (if provided).
                            The name is only used to register the node in the diagram scope, what is rendered
                            inside the node is defined by the 'title' named argument.
                            The node is customizable by providing content handlers to this function,
                            using the same protocol as the content handlers of a classifier.
                        `,
                        params: [
                            [0, "The type of the node, e.g. action"],
                            [1, "The shape definition used to render the node"],
                            [2, "The content handlers, e.g. for the title and pins"]
                        ],
                        returns: "A function that creates an activity node."
                    }
                )
            ),
        `
            scope.internal.activityNodeTitleContentHandler = [
                { },
                {
                    this.nodeArgs = args.args
                    this.contents = args.contents
                    this.title = nodeArgs.title
                    if(nodeArgs.keywords != null) {
                        scope.internal.renderKeywords(nodeArgs.keywords, contents)
                    }
                    if(title != null) {
                        contents += text(
                            contents = if(isString(title)) {
                                list(span(text = title))
                            } {
                                title
                            },
                            class = list("activity-node-title")
                        )
                    }
                }
            ]

            scope.styles {
                cls("activity-node-element") {
                    vAlign = "center"
                    hAlign = "center"
                    minWidth = 120
                    minHeight = 60
                    maxWidth = 300

                    cls("activity-node") {
                        fill = var("background")
                    }
                    cls("activity-node-container") {
                        margin = 10
                        layout = "vbox"
                        hAlign = "center"
                        vAlign = "center"
                    }
                    type("text") {
                        hAlign = "center"
                    }
                }
            }
        `
    ]
);
