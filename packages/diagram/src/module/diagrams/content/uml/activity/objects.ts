import { fun, id, listType, object, optional, str, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";
import { stringOrSpanListType } from "../../../../base/types.js";

/**
 * Module providing the object nodes: the regular object node, a rectangle holding the name of the
 * object and optionally its state, and the signal object node, which holds the same but is rendered
 * with the signal shape, so it interlocks with the send signal and accept event actions it sits between
 */
export const objectsModule = ContentModule.create(
    "uml/activity/objects",
    ["uml/classifier/classifier", "uml/activity/activityNode"],
    [],
    [
        `
            _object = scope.internal.createActivityNode(
                "object",
                scope.defaultShapes.rect,
                list(scope.internal.activityNodeTitleContentHandler)
            )
            _signalObject = scope.internal.createActivityNode(
                "signalObject",
                scope.defaultShapes.chevron,
                list(scope.internal.activityNodeTitleContentHandler)
            )

            // the title of an object node: its name, followed by its state in brackets if one is given
            _objectTitle = {
                (name, state) = args
                if(state == null) {
                    name
                } {
                    this.title = if(isString(name)) {
                        list(span(text = name))
                    } {
                        this.titleParts = list()
                        titleParts.addAll(name)
                        titleParts
                    }
                    title += span(text = " [" + state + "]")
                    title
                }
            }
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("object"),
                fun(
                    `
                        (name) = args
                        this.objectArgs = args
                        _object(
                            name,
                            null,
                            title = _objectTitle(name, objectArgs.state),
                            keywords = objectArgs.keywords,
                            args = objectArgs
                        )
                    `,
                    {
                        docs: "Creates an object node.",
                        params: [
                            [0, "the name of the object node", stringOrSpanListType],
                            [
                                "state",
                                "the optional state of the object node, rendered in brackets",
                                optional(stringType)
                            ],
                            ["keywords", "the keywords of the object node", optional(listType(stringOrSpanListType))]
                        ],
                        snippet: `("$1")`,
                        returns: "The created object node"
                    }
                ),
                object([
                    {
                        name: "Object/Object",
                        value: str('object("Example")')
                    },
                    {
                        name: "Object/Object with state",
                        value: str('object("Example", state = "created")')
                    },
                    {
                        name: "Object/Data store",
                        value: str('object("Example", keywords = list("datastore"))')
                    },
                    {
                        name: "Object/Central buffer",
                        value: str('object("Example", keywords = list("centralBuffer"))')
                    }
                ])
            ),
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("signalObject"),
                fun(
                    `
                        (name) = args
                        this.objectArgs = args
                        _signalObject(
                            name,
                            null,
                            title = _objectTitle(name, objectArgs.state),
                            keywords = objectArgs.keywords,
                            args = objectArgs
                        )
                    `,
                    {
                        docs: `
                            Creates a signal object node, an object node for tokens with a signal as type.
                            It is rendered with a point on the right and a matching notch on the left, so that
                            it interlocks with the send signal and accept event actions it sits between.
                        `,
                        params: [
                            [0, "the name of the signal object node", stringOrSpanListType],
                            [
                                "state",
                                "the optional state of the signal object node, rendered in brackets",
                                optional(stringType)
                            ],
                            [
                                "keywords",
                                "the keywords of the signal object node",
                                optional(listType(stringOrSpanListType))
                            ]
                        ],
                        snippet: `("$1")`,
                        returns: "The created signal object node"
                    }
                ),
                object([
                    {
                        name: "Object/Signal object",
                        value: str('signalObject("Example")')
                    }
                ])
            )
    ]
);
