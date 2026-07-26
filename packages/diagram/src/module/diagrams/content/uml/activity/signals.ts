import { fun, id, listType, object, optional, str } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";
import { stringOrSpanListType } from "../../../../base/types.js";

/**
 * Module providing the signal nodes: the send signal action (a rectangle with a point on the right)
 * and the accept event action (a rectangle with a notch on the left)
 */
export const signalsModule = ContentModule.create(
    "uml/activity/signals",
    ["uml/classifier/classifier", "uml/activity/activityNode"],
    [],
    [
        `
            _sendSignal = scope.internal.createActivityNode(
                "sendSignal",
                scope.defaultShapes.chevronStart,
                list(scope.internal.activityNodeTitleContentHandler)
            )
            _acceptEvent = scope.internal.createActivityNode(
                "acceptEvent",
                scope.defaultShapes.chevronEnd,
                list(scope.internal.activityNodeTitleContentHandler)
            )
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("sendSignal"),
                fun(
                    `
                        (name) = args
                        _sendSignal(name, null, title = name, keywords = args.keywords, args = args)
                    `,
                    {
                        docs: "Creates a send signal action, rendered as a rectangle with a point on the right.",
                        params: [
                            [0, "the name of the signal, rendered inside the node", stringOrSpanListType],
                            ["keywords", "the keywords of the node", optional(listType(stringOrSpanListType))]
                        ],
                        snippet: `("$1")`,
                        returns: "The created send signal action"
                    }
                ),
                object([
                    {
                        name: "Signal/Send signal",
                        value: str('sendSignal("Example")')
                    }
                ])
            ),
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("acceptEvent"),
                fun(
                    `
                        (name) = args
                        _acceptEvent(name, null, title = name, keywords = args.keywords, args = args)
                    `,
                    {
                        docs: "Creates an accept event action, rendered as a rectangle with a notch on the left.",
                        params: [
                            [0, "the name of the event, rendered inside the node", stringOrSpanListType],
                            ["keywords", "the keywords of the node", optional(listType(stringOrSpanListType))]
                        ],
                        snippet: `("$1")`,
                        returns: "The created accept event action"
                    }
                ),
                object([
                    {
                        name: "Signal/Accept event",
                        value: str('acceptEvent("Example")')
                    }
                ])
            )
    ]
);
