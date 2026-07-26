import { fun, id, object, str } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";
import { stringOrSpanListType } from "../../../../base/types.js";

/**
 * Module providing the connector node, a small circle holding a label which is used
 * to split a long flow into multiple parts
 */
export const connectorModule = ContentModule.create(
    "uml/activity/connector",
    ["uml/classifier/classifier", "uml/activity/activityNode"],
    [],
    [
        `
            _connector = scope.internal.createActivityNode(
                "connector",
                scope.defaultShapes.circle,
                list(scope.internal.activityNodeTitleContentHandler)
            )
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("connector"),
                fun(
                    `
                        (name) = args
                        _connector(name, null, title = name, args = args)
                    `,
                    {
                        docs: `
                            Creates a connector, a small circle holding a label.
                            Connectors are used in pairs: the flow entering the first one continues
                            at the second one with the same label.
                        `,
                        params: [[0, "the label of the connector, rendered inside the circle", stringOrSpanListType]],
                        snippet: `("$1")`,
                        returns: "The created connector"
                    }
                ),
                object([
                    {
                        name: "Connector/Connector",
                        value: str('connector("A")')
                    }
                ])
            ),
        `
            scope.styles {
                cls("connector-element") {
                    minWidth = 40
                    minHeight = 40
                    maxWidth = unset

                    cls("activity-node-container") {
                        margin = 4
                    }
                }
            }
        `
    ]
);
