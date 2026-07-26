import { fun, functionType, id, listType, object, optional, str } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";
import { stringOrSpanListType } from "../../../../base/types.js";

/**
 * Module providing the action element, the rounded rectangle which is the primary node
 * of an activity diagram
 */
export const actionModule = ContentModule.create(
    "uml/activity/action",
    ["uml/classifier/classifier", "uml/activity/activityNode", "uml/activity/pins"],
    [],
    [
        `
            _action = scope.internal.createActivityNode(
                "action",
                scope.defaultShapes.rect,
                list(
                    scope.internal.activityNodeTitleContentHandler,
                    scope.internal.pinsContentHandler
                )
            )
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("action"),
                fun(
                    `
                        (name, callback) = args
                        _action(name, callback, title = name, keywords = args.keywords, args = args)
                    `,
                    {
                        docs: "Creates an action.",
                        params: [
                            [0, "the name of the action, rendered inside the node", stringOrSpanListType],
                            [1, "the function defining the content of the action", optional(functionType)],
                            ["keywords", "the keywords of the action", optional(listType(stringOrSpanListType))]
                        ],
                        snippet: `("$1")`,
                        returns: "The created action"
                    }
                ),
                object([
                    {
                        name: "Action/Action",
                        value: str('action("Example")')
                    },
                    {
                        name: "Action/Action with pins",
                        value: str(
                            `
                                action("Example") {
                                    pin(0, "in")
                                    pin(0.5, "out")
                                }
                            `
                        )
                    },
                    {
                        name: "Action/Action with keyword",
                        value: str('action("Example", keywords = list("subactivity"))')
                    }
                ])
            ),
        `
            scope.styles {
                cls("action-element") {
                    cls("action") {
                        cornerRounding = 20
                    }
                }
            }
        `
    ]
);
