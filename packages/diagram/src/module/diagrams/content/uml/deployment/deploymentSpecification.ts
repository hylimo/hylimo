import { fun, functionType, id, listType, object, optional, str } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";
import { stringOrSpanListType } from "../../../../base/types.js";

/**
 * Module providing the deployment specification element.
 *
 * A deployment specification is a rectangular classifier marked by the «deployment spec» keyword,
 * whose parameters - `deploymentLocation` and `executionLocation` in UML, but any others are allowed -
 * are the ordinary value specifications of a classifier. It is attached to the artifact or the
 * deployment it parametrises with a plain dependency.
 */
export const deploymentSpecificationModule = ContentModule.create(
    "uml/deployment/deploymentSpecification",
    [
        "uml/classifier/classifier",
        "uml/classifier/defaultTitle",
        "uml/classifier/sections",
        "uml/classifier/values",
        "uml/classifier/content"
    ],
    [],
    [
        `
            _deploymentSpec = scope.internal.createClassifier(
                "deploymentSpec",
                list(
                    scope.internal.defaultTitleContentHandler,
                    scope.internal.sectionsContentHandler,
                    scope.internal.valuesContentHandler,
                    scope.internal.contentContentHandler
                )
            )
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("deploymentSpec"),
                fun(
                    `
                        (name, callback) = args
                        this.otherKeywords = args.keywords
                        this.keywords = list("deployment spec")
                        if(otherKeywords != null) {
                            keywords.addAll(otherKeywords)
                        }
                        _deploymentSpec(name, callback, title = name, keywords = keywords, args = args)
                    `,
                    {
                        docs: "Creates a deployment specification, the parameters an artifact is deployed and executed with.",
                        params: [
                            [0, "the name of the deployment specification", stringOrSpanListType],
                            [1, "the function defining the deployment specification content", optional(functionType)],
                            [
                                "keywords",
                                "the additional keywords of the deployment specification",
                                optional(listType(stringOrSpanListType))
                            ]
                        ],
                        snippet: `("$1") {\n    $2\n}`,
                        returns: "The created deployment specification"
                    }
                ),
                object([
                    {
                        name: "Artifact/Deployment specification",
                        value: str('deploymentSpec("Example")')
                    },
                    {
                        name: "Artifact/Deployment specification with values",
                        value: str(
                            `
                                deploymentSpec("Example") {
                                    values {
                                        deploymentLocation = "/opt/example"
                                        executionLocation = "/opt/example/bin"
                                    }
                                }
                            `
                        )
                    }
                ])
            )
    ]
);
