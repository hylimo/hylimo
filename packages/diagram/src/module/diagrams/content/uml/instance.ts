import { fun, functionType, id, listType, object, optional, or, str, stringType } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";

/**
 * Module providing the UML 'instance' function for object/sequence diagrams
 */
export const instanceModule = ContentModule.create(
    "uml/instance",
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
            scope.internal.createInstance = scope.internal.createClassifier(
                "instance",
                list(
                    scope.internal.defaultTitleContentHandler,
                    scope.internal.sectionsContentHandler,
                    scope.internal.valuesContentHandler,
                    scope.internal.contentContentHandler
                )
            )

            scope.internal.parseInstanceArgs = {
                (name, class, callback) = args[0]
                this.title = name ?? ""
                name = name ?? class
                if(class != null) {
                    if(isString(class)) {
                        title = title + ":" + class
                    } {
                        if(callback != null) {
                            error("Both the class name and body of instance '\${name}' are set to functions which is not allowed. Either provide a class name string as second argument, or pass at most two arguments")
                        }
                        callback = class
                    }
                }
                [name, title, callback]
            }
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("instance"),
                fun(
                    `
                        (name, title, callback) = scope.internal.parseInstanceArgs(args)
                        scope.internal.createInstance(name, callback, title = title, keywords = args.keywords, args = args)
                    `,
                    {
                        docs: "Creates an instance.",
                        params: [
                            [
                                0,
                                "the optional name of the instance, if not given, the second parameter must be provided",
                                optional(stringType)
                            ],
                            [1, "the optional class name of this instance", optional(or(stringType, functionType))],
                            [2, "the callback function of this instance", optional(functionType)],
                            ["keywords", "the keywords of the instance", optional(listType(stringType))]
                        ],
                        snippet: `("$1") {\n    $2\n}`,
                        returns: "The created instance"
                    }
                ),
                object([
                    {
                        name: "Instance/Instance",
                        value: str('instance("Example")')
                    },
                    {
                        name: "Instance/Instance with name",
                        value: str('instance("example", "Example")')
                    },
                    {
                        name: "Instance/Instance with values",
                        value: str(
                            `
                                instance("example", "Example") {
                                    values {
                                        hello = "World"
                                        number = 42
                                    }
                                }
                            `
                        )
                    }
                ])
            ),
        `
            scope.styles {
                cls("instance-element") {
                    cls("title") {
                        underline = true
                    }
                }
            }
        `
    ]
);
