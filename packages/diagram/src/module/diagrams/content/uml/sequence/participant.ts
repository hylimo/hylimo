import { fun, functionType, id, listType, object, optional, or, str } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";
import { stringOrSpanListType } from "../../../../base/types.js";

/**
 * Module providing the participant for UML sequence diagrams.
 * The participant is a simplified instance, without the underline
 * and without support for values.
 */
export const participantModule = ContentModule.create(
    "uml/sequence/participant",
    ["uml/sequence/registerClassifier", "uml/instance", "uml/classifier/classifier", "uml/classifier/defaultTitle"],
    [],
    [
        `
            _participant = scope.internal.createClassifier(
                "participant",
                list(
                    scope.internal.defaultTitleContentHandler
                )
            )
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("participant"),
                fun(
                    `
                        (name, title, callback) = scope.internal.parseInstanceArgs(args)
                        _participant(name, callback, title = title, keywords = args.keywords, args = args)
                    `,
                    {
                        docs: "Creates an participant.",
                        params: [
                            [
                                0,
                                "the optional name of the participant, if not given, the second parameter must be provided",
                                optional(stringOrSpanListType)
                            ],
                            [
                                1,
                                "the optional class name of this participant",
                                optional(or(stringOrSpanListType, functionType))
                            ],
                            [2, "the callback function of this participant", optional(functionType)],
                            ["keywords", "the keywords of the participant", optional(listType(stringOrSpanListType))]
                        ],
                        snippet: `("$1") {\n    $2\n}`,
                        returns: "The created participant"
                    }
                ),
                object([
                    {
                        name: "Participant/Participant",
                        value: str('participant("Example")')
                    },
                    {
                        name: "Participant/Participant with name",
                        value: str('participant("example", "Example")')
                    }
                ])
            ),
        `
            scope.styles {
                cls("participant-element") {
                    minWidth = 50
                }
            }
        `
    ]
);
