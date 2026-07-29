import { bool, booleanType, fun, functionType, id, listType, object, optional, or, str } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";
import { stringOrSpanListType } from "../../../../base/types.js";

/**
 * Module providing the artifact element.
 *
 * An artifact is an ordinary rectangular classifier which is marked as one by the «artifact» keyword,
 * the icon in its upper right corner, or both - UML permits any of the three, so both markers are
 * configurable on their own. Like a deployment target it can be written as an instance specification,
 * which is what the second argument turns it into.
 */
export const artifactModule = ContentModule.create(
    "uml/deployment/artifact",
    [
        "uml/classifier/classifier",
        "uml/classifier/artifactTitle",
        "uml/classifier/sections",
        "uml/classifier/propertiesAndMethods",
        "uml/classifier/values",
        "uml/classifier/content",
        "uml/instance"
    ],
    [],
    [
        `
            _artifact = scope.internal.createClassifier(
                "artifact",
                list(
                    scope.internal.artifactTitleContentHandler,
                    scope.internal.sectionsContentHandler,
                    scope.internal.propertiesAndMethodsContentHandler,
                    scope.internal.valuesContentHandler,
                    scope.internal.contentContentHandler
                )
            )
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("artifact"),
                fun(
                    `
                        (name, title, callback) = scope.internal.parseInstanceArgs(args)
                        this.otherKeywords = args.keywords
                        this.keywords = if(scope.internal.config.showArtifactKeyword) {
                            this.allKeywords = list("artifact")
                            if(otherKeywords != null) {
                                allKeywords.addAll(otherKeywords)
                            }
                            allKeywords
                        } {
                            otherKeywords
                        }
                        if((args[1] != null) && (isString(args[1]) || isObject(args[1]))) {
                            title = scope.internal.instanceTitle(title)
                        }
                        _artifact(name, callback, title = title, keywords = keywords, args = args)
                    `,
                    {
                        docs: "Creates an artifact, a physical piece of information such as a file.",
                        params: [
                            [
                                0,
                                "the optional name of the artifact, if not given, the second parameter must be provided",
                                optional(stringOrSpanListType)
                            ],
                            [
                                1,
                                "the optional type of this artifact, making it an instance specification",
                                optional(or(stringOrSpanListType, functionType))
                            ],
                            [2, "the function defining the artifact content", optional(functionType)],
                            [
                                "keywords",
                                "the additional keywords of the artifact",
                                optional(listType(stringOrSpanListType))
                            ]
                        ],
                        snippet: `("$1")`,
                        returns: "The created artifact"
                    }
                ),
                object([
                    {
                        name: "Artifact/Artifact",
                        value: str('artifact("example.jar")')
                    },
                    {
                        name: "Artifact/Artifact instance",
                        value: str('artifact("example.jar", "Example")')
                    }
                ])
            )
    ],
    [["showArtifactKeyword", "Whether to show the artifact keyword", booleanType, bool(true)]]
);
