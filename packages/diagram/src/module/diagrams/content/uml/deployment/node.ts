import { bool, booleanType, fun, functionType, id, listType, object, optional, or, str } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";
import { stringOrSpanListType } from "../../../../base/types.js";

/**
 * Module providing the deployment targets of a deployment diagram: the node, and its two
 * specializations device and execution environment.
 *
 * All three are the same classifier on the 3D box, they differ only in the keyword UML prescribes for
 * them - a node carries none, as the 3D box alone is its notation. Each of them may be written either
 * as a type or, by naming a type as the second argument, as an instance specification, which is the
 * form most deployment diagrams are drawn in; that is the same distinction the `instance` element
 * makes, so its argument parsing and its underlined title are reused verbatim.
 *
 * Nesting one target in another is not decoration but notation: an artifact nested in a node *is* a
 * Deployment, and an execution environment nested in a device *is* how UML expresses that it runs on
 * it. The nesting itself is the regular classifier subcanvas.
 */
export const nodeModule = ContentModule.create(
    "uml/deployment/node",
    [
        "uml/classifier/classifier",
        "uml/classifier/defaultTitle",
        "uml/classifier/sections",
        "uml/classifier/propertiesAndMethods",
        "uml/classifier/content",
        "uml/classifier/ports",
        "uml/classifier/providesAndRequires",
        "uml/instance",
        "common/defaultShapes"
    ],
    [],
    [
        `
            _node = scope.internal.createClassifier(
                "node",
                list(
                    scope.internal.defaultTitleContentHandler,
                    scope.internal.sectionsContentHandler,
                    scope.internal.propertiesAndMethodsContentHandler,
                    scope.internal.contentContentHandler,
                    scope.internal.portsContentHandler,
                    scope.internal.providesRequiresContentHandler
                ),
                shape = scope.defaultShapes.box3d
            )

            _createDeploymentTarget = {
                (targetKeyword, targetArgs) = args
                (name, title, callback) = scope.internal.parseInstanceArgs(targetArgs)
                this.keywords = if(targetKeyword != null) {
                    this.allKeywords = list(targetKeyword)
                    if(targetArgs.keywords != null) {
                        allKeywords.addAll(targetArgs.keywords)
                    }
                    allKeywords
                } {
                    targetArgs.keywords
                }
                // naming a type as the second argument is what turns the target into an instance
                // specification, and an instance specification underlines its name
                if((targetArgs[1] != null) && (isString(targetArgs[1]) || isObject(targetArgs[1]))) {
                    title = scope.internal.instanceTitle(title)
                }
                _node(name, callback, title = title, keywords = keywords, args = targetArgs)
            }
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("node"),
                fun(
                    `
                        _createDeploymentTarget(null, args)
                    `,
                    {
                        docs: "Creates a node, rendered as a 3D box.",
                        params: [
                            [
                                0,
                                "the optional name of the node, if not given, the second parameter must be provided",
                                optional(stringOrSpanListType)
                            ],
                            [
                                1,
                                "the optional type of this node, making it an instance specification",
                                optional(or(stringOrSpanListType, functionType))
                            ],
                            [2, "the function defining the node content", optional(functionType)],
                            ["keywords", "the keywords of the node", optional(listType(stringOrSpanListType))]
                        ],
                        snippet: `("$1") {\n    $2\n}`,
                        returns: "The created node"
                    }
                ),
                object([
                    {
                        name: "Node/Node",
                        value: str('node("Example")')
                    },
                    {
                        name: "Node/Node instance",
                        value: str('node("example", "Example")')
                    },
                    {
                        name: "Node/Node with artifact",
                        value: str(
                            `
                                node("Example") {
                                    artifact("example.jar")
                                }
                            `
                        )
                    }
                ])
            ),
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("device"),
                fun(
                    `
                        _createDeploymentTarget(
                            if(scope.internal.config.showDeviceKeyword) { "device" } { null },
                            args
                        )
                    `,
                    {
                        docs: "Creates a device, a node which is a physical computational resource.",
                        params: [
                            [
                                0,
                                "the optional name of the device, if not given, the second parameter must be provided",
                                optional(stringOrSpanListType)
                            ],
                            [
                                1,
                                "the optional type of this device, making it an instance specification",
                                optional(or(stringOrSpanListType, functionType))
                            ],
                            [2, "the function defining the device content", optional(functionType)],
                            [
                                "keywords",
                                "the additional keywords of the device",
                                optional(listType(stringOrSpanListType))
                            ]
                        ],
                        snippet: `("$1") {\n    $2\n}`,
                        returns: "The created device"
                    }
                ),
                object([
                    {
                        name: "Node/Device",
                        value: str('device("Example")')
                    },
                    {
                        name: "Node/Device with execution environment",
                        value: str(
                            `
                                device("Example") {
                                    executionEnvironment("Example environment")
                                }
                            `
                        )
                    }
                ])
            ),
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("executionEnvironment"),
                fun(
                    `
                        _createDeploymentTarget(
                            if(scope.internal.config.showExecutionEnvironmentKeyword) { "executionEnvironment" } { null },
                            args
                        )
                    `,
                    {
                        docs: "Creates an execution environment, a node which is the software container artifacts are deployed in.",
                        params: [
                            [
                                0,
                                "the optional name of the execution environment, if not given, the second parameter must be provided",
                                optional(stringOrSpanListType)
                            ],
                            [
                                1,
                                "the optional type of this execution environment, making it an instance specification",
                                optional(or(stringOrSpanListType, functionType))
                            ],
                            [2, "the function defining the execution environment content", optional(functionType)],
                            [
                                "keywords",
                                "the additional keywords of the execution environment",
                                optional(listType(stringOrSpanListType))
                            ]
                        ],
                        snippet: `("$1") {\n    $2\n}`,
                        returns: "The created execution environment"
                    }
                ),
                object([
                    {
                        name: "Node/Execution environment",
                        value: str('executionEnvironment("Example")')
                    }
                ])
            ),
        `
            scope.styles {
                cls("node-element") {
                    // the 3D box has a fixed-size depth in both directions, below twice which its
                    // outline would fold back on itself, exactly like the note of a comment
                    minHeight = 60
                }
            }
        `
    ],
    [
        ["showDeviceKeyword", "Whether to show the device keyword", booleanType, bool(true)],
        ["showExecutionEnvironmentKeyword", "Whether to show the executionEnvironment keyword", booleanType, bool(true)]
    ]
);
