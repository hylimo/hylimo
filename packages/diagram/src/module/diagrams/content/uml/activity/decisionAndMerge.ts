import { fun, id, object, optional, str } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";
import { stringOrSpanListType } from "../../../../base/types.js";

/**
 * Module providing the decision and merge nodes, both rendered as a diamond.
 * Both optionally take a text which is rendered inside the diamond, if no text is given,
 * the diamond is rendered with its default size.
 */
export const decisionAndMergeModule = ContentModule.create(
    "uml/activity/decisionAndMerge",
    ["uml/classifier/classifier", "uml/activity/activityNode"],
    [],
    [
        `
            _decision = scope.internal.createActivityNode(
                "decision",
                scope.defaultShapes.diamond,
                list(scope.internal.activityNodeTitleContentHandler)
            )
            _merge = scope.internal.createActivityNode(
                "merge",
                scope.defaultShapes.diamond,
                list(scope.internal.activityNodeTitleContentHandler)
            )
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("decision"),
                fun(
                    `
                        (name) = args
                        _decision(name, null, title = name, args = args)
                    `,
                    {
                        docs: "Creates a decision node. If a text is given, it is rendered inside the diamond.",
                        params: [
                            [
                                0,
                                "the optional text of the decision node, also used to register it in the diagram scope",
                                optional(stringOrSpanListType)
                            ]
                        ],
                        snippet: `()`,
                        returns: "The created decision node"
                    }
                ),
                object([
                    {
                        name: "Decision/Decision",
                        value: str("decision()")
                    },
                    {
                        name: "Decision/Decision with text",
                        value: str('decision("Valid?")')
                    }
                ])
            ),
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("merge"),
                fun(
                    `
                        (name) = args
                        _merge(name, null, title = name, args = args)
                    `,
                    {
                        docs: "Creates a merge node. If a text is given, it is rendered inside the diamond.",
                        params: [
                            [
                                0,
                                "the optional text of the merge node, also used to register it in the diagram scope",
                                optional(stringOrSpanListType)
                            ]
                        ],
                        snippet: `()`,
                        returns: "The created merge node"
                    }
                ),
                object([
                    {
                        name: "Decision/Merge",
                        value: str("merge()")
                    }
                ])
            ),
        `
            scope.styles {
                cls("decision-element") {
                    minWidth = 50
                    minHeight = 50

                    cls("activity-node-container") {
                        margin = 5
                    }
                }
                cls("merge-element") {
                    minWidth = 50
                    minHeight = 50

                    cls("activity-node-container") {
                        margin = 5
                    }
                }
            }
        `
    ]
);
