import { booleanType, fun, id, object, optional, str, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";

/**
 * Module providing the fork and join nodes, both rendered as a filled bar.
 * By default the bar is horizontal, meaning it splits / synchronizes a top to bottom flow.
 */
export const forkAndJoinModule = ContentModule.create(
    "uml/activity/forkAndJoin",
    ["uml/classifier/classifier", "uml/activity/activityNode"],
    [],
    [
        `
            _fork = scope.internal.createActivityNode("fork", scope.defaultShapes.rect, list())
            _join = scope.internal.createActivityNode("join", scope.defaultShapes.rect, list())

            _createBarNode = {
                (nodeFunction, name, barArgs) = args
                this.node = nodeFunction(name, null, args = barArgs)
                node.class += "bar-element"
                if(barArgs.vertical == true) {
                    node.class += "vertical-bar-element"
                } {
                    node.class += "horizontal-bar-element"
                }
                node
            }
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("fork"),
                fun(
                    `
                        (name) = args
                        _createBarNode(_fork, name, args)
                    `,
                    {
                        docs: "Creates a fork node, which splits a flow into multiple concurrent flows.",
                        params: [
                            [
                                0,
                                "the optional name under which the node is registered in the diagram scope, not rendered",
                                optional(stringType)
                            ],
                            [
                                "vertical",
                                "whether the bar is vertical instead of horizontal, defaults to false",
                                optional(booleanType)
                            ]
                        ],
                        snippet: `()`,
                        returns: "The created fork node"
                    }
                ),
                object([
                    {
                        name: "Fork/Fork",
                        value: str("fork()")
                    },
                    {
                        name: "Fork/Vertical fork",
                        value: str("fork(vertical = true)")
                    }
                ])
            ),
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("join"),
                fun(
                    `
                        (name) = args
                        _createBarNode(_join, name, args)
                    `,
                    {
                        docs: "Creates a join node, which synchronizes multiple concurrent flows into one.",
                        params: [
                            [
                                0,
                                "the optional name under which the node is registered in the diagram scope, not rendered",
                                optional(stringType)
                            ],
                            [
                                "vertical",
                                "whether the bar is vertical instead of horizontal, defaults to false",
                                optional(booleanType)
                            ]
                        ],
                        snippet: `()`,
                        returns: "The created join node"
                    }
                ),
                object([
                    {
                        name: "Fork/Join",
                        value: str("join()")
                    },
                    {
                        name: "Fork/Vertical join",
                        value: str("join(vertical = true)")
                    }
                ])
            ),
        `
            scope.styles {
                vars {
                    barThickness = 10
                    barLength = 200
                }
                cls("bar-element") {
                    maxWidth = unset

                    cls("activity-node") {
                        fill = var("primary")
                        stroke = unset
                    }
                    cls("activity-node-container") {
                        margin = 0
                    }
                }
                // like for a terminal node, the size is provided as the bounds instead of as the width and
                // height, so that it stays free for the resize edit of the element
                cls("horizontal-bar-element") {
                    minWidth = var("barLength")
                    minHeight = var("barThickness")
                    maxWidth = var("barLength")
                    maxHeight = var("barThickness")
                }
                cls("vertical-bar-element") {
                    minWidth = var("barThickness")
                    minHeight = var("barLength")
                    maxWidth = var("barThickness")
                    maxHeight = var("barLength")
                }
            }
        `
    ]
);
